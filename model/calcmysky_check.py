"""Cross-check of the sky model against CalcMySky (Kabatsayev; Bruneton & Neyret 2008).

Each epoch's atmosphere, as epochs.build() makes it, is written out as a CalcMySky
.atmo description: every component's own vertical profile (tabulated every 0.25 km,
interpolated in GLSL), its optical depth (a power law in wavelength, fitted, with the
residual checked), its single-scattering albedo, phase function (Rayleigh or
Henyey-Greenstein) and the epoch's Sun and ground albedo. calcmysky precomputes
single and multiple scattering to the given order in spherical geometry; its radiance
textures at the ground are read back here and compared, single and multiple
scattering separately, with Atmosphere.radiance(..., ms=False) and multiple_scatter().

    python calcmysky_check.py write  EPOCH ORDERS OUTDIR     # write OUTDIR/EPOCH.atmo
    calcmysky OUTDIR/EPOCH.atmo --out-dir MODELDIR --radiance --no-eds-tex
    python calcmysky_check.py read   EPOCH MODELDIR OUT.npz  # sample a computed model
    python calcmysky_check.py ours   EPOCH OUT.npz [two_stream]  # our model on the same grid

The sampled CalcMySky results (CalcMySky v0.4.0) are kept in data/calcmysky/; the
textures themselves are 3-9 GB per run. summarize() and figure() compare the two.
"""
import math, sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from skymodel import LAM, R_E, planck, _O3_SIGMA, _N_PER_DU
from epochs import EPOCHS, build

E = {e['key']: e for e in EPOCHS}
ALBEDO = 0.18            # Mid-latitude, as daycycle.py
H_TOP = 120.0            # km, the model's top
WL = np.arange(380.0, 811.0, 10.0)   # 44 wavelengths (CalcMySky wants a multiple of 4)
DH = 0.25                # km, profile table step
HGRID = np.arange(0.0, H_TOP + DH/2, DH)
SIGMA_REF = 1e-12        # m^2: every scatterer's cross-section at 1 um is 1 um^2

SZAS = [0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 84, 87, 89] + list(range(90, 111))
VZ = [0, 15, 30, 45, 60, 70, 78, 84, 88]
AZ = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]

HEADER = """version: 6
transmittance texture size for VZA: 512
transmittance texture size for altitude: 128
irradiance texture size for SZA: 128
irradiance texture size for altitude: 32
scattering texture size for VZA: 128
scattering texture size for dot(view,sun): 16
scattering texture size for SZA: 256
scattering texture size for altitude: 32
eclipsed scattering texture size for relative azimuth: 32
eclipsed scattering texture size for VZA: 128
eclipsed double scattering texture size for relative azimuth: 16
eclipsed double scattering texture size for VZA: 128
eclipsed double scattering texture size for SZA: 16
eclipsed double scattering number of azimuth pairs to sample: 2
eclipsed double scattering number of elevation pairs to sample: 10
light pollution texture size for VZA: 16
light pollution texture size for altitude: 8
light pollution angular integration points: 20
transmittance integration points: 1000
radial integration points: 200
angular integration points: 1024
angular integration points for eclipse: 512
scattering orders: {orders}
Earth-Sun distance: 1 AU
Earth-Moon distance: 384400 km
Earth radius: {R} km
atmosphere height: {H} km
wavelengths: min=380nm,max=810nm,count=44
"""


def get_atm(key):
    """The epoch's atmosphere; KEY_iso is the same with every phase function's asymmetry set to 0
    (a test of how much the forward peaks matter)."""
    base, iso = (key[:-4], True) if key.endswith('_iso') else (key, False)
    atm = build(E[base], ALBEDO)
    if iso:
        for c in atm.comps:
            c.g = 0.0
    return atm


def ext(a):
    """A spectrum on LAM carried to WL, flat past 780 nm."""
    return np.interp(WL, LAM, a)


def lst(a):
    return ','.join(f'{v:.6e}' for v in a)


def profile_fn(prof, scale):
    """GLSL body for scale * prof(altitude): closed form for skymodel's expo() and
    gauss_layer() profiles (a table is several times slower on the GPU), else a table."""
    from skymodel import expo, gauss_layer
    if isinstance(prof, expo):
        H = prof.H
        return f"""    ```
        return {scale/H:.9e}*exp(-altitude/{H*1000:.3f});
    ```"""
    if isinstance(prof, gauss_layer):
        hc, w, norm = prof.hc, prof.w, prof.norm
        return f"""    ```
        return {scale/norm:.9e}*exp(-0.5*sqr((altitude-{hc*1000:.3f})/{w*1000:.3f}));
    ```"""
    return table_fn(prof, scale)


def table_fn(prof, scale):
    """GLSL body: scale * prof(altitude) from a table every DH km, linear between."""
    vals = ','.join(f'{v:.6e}' for v in prof(HGRID.copy()))
    n = len(HGRID)
    return f"""    ```
        const float t[{n}]=float[{n}]({vals});
        float x=clamp(altitude/{DH*1000:.1f}, 0., {n-1:.1f});
        int i=min(int(x), {n-2});
        return {scale:.9e}*mix(t[i], t[i+1], x-float(i));
    ```"""


def atmo_text(key, orders):
    atm = get_atm(key)
    T, L = E[key.removesuffix('_iso')]['sun']
    sun = planck(WL, T) / planck(LAM, 5772.0).max() * L * (5772.0/T)**4
    out = [HEADER.format(orders=orders, R=R_E, H=H_TOP),
           f'solar irradiance at TOA: {lst(sun)}',
           f'ground albedo: {lst(np.full(len(WL), atm.albedo))}',
           f'light pollution relative radiance: {lst(np.full(len(WL), 1e-6))}', '']
    notes = []
    for c in atm.comps:
        if c.name == 'ozone':
            # tau = sigma * N_col: c.tau is _O3_SIGMA * DU * _N_PER_DU (cm^2, cm^-2)
            du = c.tau[0] / (_O3_SIGMA[0]*_N_PER_DU)
            n_col = du*_N_PER_DU*1e4                            # m^-2
            out += [f'Absorber "{c.name}":', '{', '    number density:',
                    profile_fn(c.profile, n_col/1000.0),
                    f'    cross section: {lst(ext(_O3_SIGMA)*1e-4)}', '}', '']
            notes.append(f'{c.name}: {du:.1f} DU')
            continue
        lt = np.log(c.tau)
        alpha = -np.polyfit(np.log(LAM), lt, 1)[0]
        tau1um = math.exp(np.polyval(np.polyfit(np.log(LAM), lt, 1), math.log(1000.0)))
        resid = np.abs(np.exp(np.polyval(np.polyfit(np.log(LAM), lt, 1), np.log(LAM)))/c.tau - 1).max()
        n_scale = tau1um / SIGMA_REF / 1000.0                   # m^-3 per (km^-1 of profile)
        if c.rayleigh:
            ph = '        return vec4(3./(16.*PI)*(1.+sqr(dotViewSun)));'
        else:
            ph = (f'        CONST float g={c.g:.6f};\n'
                  '        return vec4((1.-g*g)/(4.*PI*pow(1.+g*g-2.*g*dotViewSun, 1.5)));')
        out += [f'Scatterer "{c.name}":', '{', '    number density:', profile_fn(c.profile, n_scale),
                '    phase function:', '    ```', ph, '    ```',
                '    cross section at 1 um: 1 um^2',
                f'    angstrom exponent: {alpha:.6f}',
                f'    single scattering albedo: {lst(np.clip(ext(c.ssa), 0, 1))}',
                '    phase function type: general', '}', '']
        notes.append(f'{c.name}: tau550={c.tau[17]:.4g} alpha={alpha:.3f} (power-law resid {resid:.1e}) '
                     f'ssa550={c.ssa[17]:.3f} g={c.g}')
    return '\n'.join(out), notes, atm


# ---------------- Reading the textures ----------------
def load_slice(path):
    """The ground-level (altitude index 0) slice of a 4D scattering texture:
    array [sza, dvs, vza, 4]."""
    with open(path, 'rb') as f:
        n0, n1, n2, n3 = (int(v) for v in np.frombuffer(f.read(8), np.uint16))
        a = np.fromfile(f, np.float32, count=n0*n1*n2*4)
    return a.reshape(n2, n1, n0, 4)


def coords(cos_sza, cos_vza, nu, N):
    """Continuous texel indices (sza, dvs, vza) at the ground, after
    scatteringTexVarsTo4DCoords / scattering4DCoordsToTexCoords (texture-coordinates.frag)."""
    n0, n1, n2 = N
    R, h = R_E*1000, H_TOP*1000
    Lh = math.sqrt(h*(h + 2*R))
    # view: rays above the horizon only (altitude 0)
    d = -R*cos_vza + np.sqrt((R*cos_vza)**2 + Lh**2)
    u = (d - h)/(Lh - h)
    half = n0/2
    tc = 0.5 + 0.5*(0.5 + (half-1)*u)/half
    ix = n0*tc - 0.5
    iy = (nu + 1)/2*(n1 - 1)
    ds = np.sqrt((R+h)**2 - R**2*(1 - cos_sza**2)) - R*cos_sza
    a = (ds - h)/(Lh - h); A = 2*R/(Lh - h)
    us = np.maximum(0, 1 - a/A)/(a + 1)
    iz = us*(n2 - 1)
    return iz, iy, ix


def trilinear(T, iz, iy, ix):
    out = 0
    z0 = np.clip(np.floor(iz).astype(int), 0, T.shape[0]-2); fz = iz - z0
    y0 = np.clip(np.floor(iy).astype(int), 0, T.shape[1]-2); fy = iy - y0
    x0 = np.clip(np.floor(ix).astype(int), 0, T.shape[2]-2); fx = ix - x0
    for dz, wz in ((0, 1-fz), (1, fz)):
        for dy, wy in ((0, 1-fy), (1, fy)):
            for dx, wx in ((0, 1-fx), (1, fx)):
                out = out + (wz*wy*wx)[..., None]*T[z0+dz, y0+dy, x0+dx]
    return out


def phase(c, nu):
    if c.rayleigh:
        return 3/(16*np.pi)*(1 + nu**2)
    g = c.g
    return (1 - g*g)/(4*np.pi*(1 + g*g - 2*g*nu)**1.5)


def read_model(key, mdir):
    """CalcMySky single- and multiple-scattering radiance on the daycycle grid:
    arrays [sza, vz, az, WL]."""
    atm = get_atm(key)
    sz = np.radians(np.array(SZAS, float))[:, None, None]
    vz = np.radians(np.array(VZ, float))[None, :, None]
    az = np.radians(np.array(AZ, float))[None, None, :]
    cs, cv = np.cos(sz)*np.ones_like(vz*az), np.cos(vz)*np.ones_like(sz*az)
    nu = np.clip(np.cos(vz)*np.cos(sz) + np.sin(vz)*np.sin(sz)*np.cos(az), -1, 1)
    ss = np.zeros(nu.shape + (len(WL),)); ms = np.zeros_like(ss)
    mdir = Path(mdir)
    for w in range(len(WL)//4):
        T = load_slice(mdir/f'multiple-scattering-wlset{w}.f32')
        idx = coords(cs, cv, nu, (T.shape[2], T.shape[1], T.shape[0]))
        ms[..., 4*w:4*w+4] = trilinear(T, *idx)
        for c in atm.comps:
            if c.name == 'ozone':
                continue
            T = load_slice(mdir/'single-scattering'/str(w)/f'{c.name}.f32')
            ss[..., 4*w:4*w+4] += trilinear(T, *idx)*phase(c, nu)[..., None]
    return ss, ms


def ours_grid(key, mode='only'):
    """Our single- and multiple-scattering radiance on the same grid, on LAM. mode 'only' is
    the multiple-scattering table (skymodel.ms_table), 'two_stream' the earlier isotropic term."""
    atm = get_atm(key)
    ss = np.zeros((len(SZAS), len(VZ), len(AZ), len(LAM))); ms = np.zeros_like(ss)
    for i, sz in enumerate(SZAS):
        for j, vz in enumerate(VZ):
            for k, az in enumerate(AZ):
                ss[i, j, k] = atm.radiance(vz, az, sz, ms=False)
                ms[i, j, k] = (atm.multiple_scatter(sz) if mode == 'two_stream'
                               else atm.radiance(vz, az, sz, ms='only'))
    return ss, ms


def summarize(key, cms_npz, ours_npz):
    """Per solar zenith angle: luminance ratios (ours / CalcMySky) and chromaticities."""
    from skymodel import spec_to_XYZ, xy, XYZ_to_srgb, hexcol, cct_mccamy
    c = np.load(cms_npz); o = np.load(ours_npz)
    li = [list(WL).index(l) for l in LAM]
    cs, cm = c['ss'][..., li], c['ms'][..., li]
    os_, om = o['ss'], o['ms']
    XYZ = lambda S: np.einsum('...l,cl->...c', S, np.stack([spec_to_XYZ(np.eye(len(LAM))[q]) for q in range(len(LAM))], 1))
    Xo, Xc = XYZ(os_ + om), XYZ(cs + cm)
    Xcs, Xcm, Xom = XYZ(cs), XYZ(cm), XYZ(om)
    rows = []
    for i, sz in enumerate(SZAS):
        r = Xo[i, ..., 1] / np.maximum(Xc[i, ..., 1], 1e-30)
        xo = Xo[i, ..., :2] / Xo[i].sum(-1, keepdims=True); xc = Xc[i, ..., :2] / Xc[i].sum(-1, keepdims=True)
        dxy = np.hypot(*(xo - xc).transpose(2, 0, 1))
        exp_ = 0.5 / Xc[i, 0, 0, 1]
        rows.append(dict(
            sza=sz, Yz_o=Xo[i, 0, 0, 1], Yz_c=Xc[i, 0, 0, 1], rz=r[0, 0],
            r_hsun=r[VZ.index(84), 0], r_hanti=r[VZ.index(84), -1],
            r_min=r.min(), r_max=r.max(),
            ms_c=Xcm[i, 0, 0, 1] / Xc[i, 0, 0, 1], ms_o=Xom[i, 0, 0, 1] / Xo[i, 0, 0, 1],
            xy_o=tuple(xo[0, 0]), xy_c=tuple(xc[0, 0]), dxy_z=dxy[0, 0], dxy_max=dxy.max(),
            cct_o=cct_mccamy(*xo[0, 0]), cct_c=cct_mccamy(*xc[0, 0]),
            hex_o=hexcol(XYZ_to_srgb(Xo[i, 0, 0], exp_)), hex_c=hexcol(XYZ_to_srgb(Xc[i, 0, 0], exp_)),
            hexh_o=hexcol(XYZ_to_srgb(Xo[i, VZ.index(84), -1], exp_)), hexh_c=hexcol(XYZ_to_srgb(Xc[i, VZ.index(84), -1], exp_)),
            ss_rz=Xo[i, 0, 0, 1] and (XYZ(os_)[i, 0, 0, 1] / max(Xcs[i, 0, 0, 1], 1e-30))))
    return rows


def figure(runs, out):
    """Zenith luminance against solar zenith angle, ours against CalcMySky, one panel
    per epoch; dashed is the multiple-scattering part alone."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from skymodel import spec_to_XYZ
    OURS, CMS = '#eb6834', '#2a78d6'
    li = [list(WL).index(l) for l in LAM]
    fig, axes = plt.subplots(1, len(runs), figsize=(4.2*len(runs), 3.6), sharex=True)
    for ax, (key, title, cms_npz, ours_npz) in zip(np.atleast_1d(axes), runs):
        c = np.load(cms_npz); o = np.load(ours_npz)
        Y = lambda S: np.array([spec_to_XYZ(s)[1] for s in S[:, 0, 0]])
        tc, mc = Y(c['ss'][..., li] + c['ms'][..., li]), Y(c['ms'][..., li])
        to, mo = Y(o['ss'] + o['ms']), Y(o['ms'])
        ax.plot(SZAS, tc, color=CMS, lw=2, label='CalcMySky')
        ax.plot(SZAS, mc, color=CMS, lw=2, ls='--')
        ax.plot(SZAS, to, color=OURS, lw=2, label='Ours')
        ax.plot(SZAS, mo, color=OURS, lw=2, ls='--')
        ax.set_yscale('log'); ax.set_title(title, fontsize=11, loc='left')
        ax.set_xlabel('Solar zenith angle (°)')
        ax.axvline(90, color='#bbbbbb', lw=1, zorder=0)
        ax.grid(True, which='major', color='#eeeeee', lw=0.8); ax.set_axisbelow(True)
        for s in ('top', 'right'):
            ax.spines[s].set_visible(False)
        ax.text(SZAS[-1], tc[-1], ' CalcMySky', color='#333333', fontsize=9, va='center')
        ax.text(SZAS[-1], to[-1], ' Ours', color='#333333', fontsize=9, va='center')
    np.atleast_1d(axes)[0].set_ylabel('Zenith luminance (relative)')
    fig.text(0.01, 0.005, 'Solid: total. Dashed: multiple scattering only.', fontsize=9, color='#555555')
    fig.tight_layout(rect=(0, 0.03, 0.97, 1))
    fig.savefig(out, dpi=150)


def _labels(ax, items, gap):
    """Direct labels at the right end of each line, pushed apart to at least a factor gap."""
    items = sorted(items)
    ys = [items[0][0]]
    for y, _ in items[1:]:
        ys.append(max(y, ys[-1]*gap))
    for y, (_, lab) in zip(ys, items):
        ax.text(SZAS[-1], y, ' ' + lab, color='#333333', fontsize=9, va='center')


def figure_ms(runs, out):
    """Per epoch: zenith luminance against solar zenith angle (top) and its ratio to CalcMySky
    (bottom), for the multiple-scattering table ("New") and the earlier two-stream term."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from skymodel import spec_to_XYZ
    CMS, NEW, OLD = '#2a78d6', '#eb6834', '#9a9a9a'
    li = [list(WL).index(l) for l in LAM]
    Y = lambda S: np.array([spec_to_XYZ(s)[1] for s in S[:, 0, 0]])
    fig, axes = plt.subplots(2, len(runs), figsize=(4.2*len(runs), 6.0), sharex=True,
                             gridspec_kw=dict(height_ratios=(3, 2)))
    for col, (title, cms_npz, new_npz, old_npz) in enumerate(runs):
        c, n, o = np.load(cms_npz), np.load(new_npz), np.load(old_npz)
        tc = Y(c['ss'][..., li] + c['ms'][..., li])
        tn, to = Y(n['ss'] + n['ms']), Y(o['ss'] + o['ms'])
        top, bot = axes[0, col], axes[1, col]
        top.plot(SZAS, to, color=OLD, lw=2)
        top.plot(SZAS, tc, color=CMS, lw=2)
        top.plot(SZAS, tn, color=NEW, lw=2)
        top.set_yscale('log'); top.set_title(title, fontsize=11, loc='left')
        bot.axhline(1, color='#555555', lw=1)
        bot.plot(SZAS, to/tc, color=OLD, lw=2)
        bot.plot(SZAS, tn/tc, color=NEW, lw=2)
        bot.set_yscale('log'); bot.set_ylim(0.1, 10)
        bot.set_xlabel('Solar zenith angle (°)')
        for ax in (top, bot):
            ax.axvline(90, color='#cccccc', lw=1, zorder=0)
            ax.grid(True, which='major', color='#eeeeee', lw=0.8); ax.set_axisbelow(True)
            for s in ('top', 'right'):
                ax.spines[s].set_visible(False)
        _labels(top, [(tc[-1], 'CalcMySky'), (tn[-1], 'New'), (to[-1], 'Two-stream')], 6.0)
        _labels(bot, [(min(max(tn[-1]/tc[-1], 0.12), 8.0), 'New'),
                      (min(max(to[-1]/tc[-1], 0.12), 8.0), 'Two-stream')], 1.6)
    axes[0, 0].set_ylabel('Zenith luminance (relative)')
    axes[1, 0].set_ylabel('Ours ÷ CalcMySky')
    fig.tight_layout(rect=(0, 0, 0.96, 1))
    fig.savefig(out, dpi=150)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'write':
        key, orders, outdir = sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
        text, notes, _ = atmo_text(key, orders)
        outdir.mkdir(parents=True, exist_ok=True)
        (outdir/f'{key}.atmo').write_text(text, encoding='utf-8', newline='\n')
        print('\n'.join(notes))
    elif cmd == 'read':
        key, mdir, out = sys.argv[2], sys.argv[3], sys.argv[4]
        ss, ms = read_model(key, mdir)
        np.savez_compressed(out, ss=ss, ms=ms, wl=WL, szas=SZAS, vz=VZ, az=AZ)
        print('saved', out)
    elif cmd == 'ours':
        key, out = sys.argv[2], sys.argv[3]
        ss, ms = ours_grid(key, *sys.argv[4:5])
        np.savez_compressed(out, ss=ss, ms=ms)
        print('saved', out)
