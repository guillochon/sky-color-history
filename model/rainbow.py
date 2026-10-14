"""Rainbows: the light raindrops scatter, as the page computes it (site_src/js/rainbow.js), checked here.

The page works out, for the drops falling in view, how much of the sunlight they intercept goes
each way (the phase function, per steradian), in linear sRGB relative to the sunlight's own colour,
so a white surface would come out (1, 1, 1)/(4 pi). It does so in the page rather than from a baked
table because the bows move with the epoch: the bow's radius depends on how much more water bends
light than the air around it, and both change. Hot water bends less (IAPWS: n falls from 1.3337 at
10 C to 1.3266 at 90 C), and so does air as dense as the Early Hadean's 30 bar of CO2, whose
refractivity, 1.0 percent, is thirty times today's. In the Early Hadean the primary bow is
some 2.6 degrees wider and the secondary 4.8 degrees narrower, so Alexander's dark band between
them closes from 8.5 degrees to about 1; in the proto-Earth's guessed 4 bar at 95 C the bows move
about a degree each; elsewhere by less than 0.3 degree.

The method, for each wavelength and drop size:
  - Geometric optics: a ray entering a drop at incidence i leaves after k internal reflections
    turned by D = 2(i - (k+1) r) + k pi, carrying the Fresnel share (1-R)^2 R^k of its light (R for
    the ray reflected off the outside), each polarisation on its own. k = 0 is the light passing
    straight through, 1 the primary bow, 2 the secondary, 3 the faint tertiary round the Sun.
  - Airy theory near the primary and secondary bows, where geometric optics has a caustic: the
    wavefront leaving the drop is cubic there, and the light is the square of the Airy function
    Ai(-z), z = delta x^(2/3) / c^(1/3), delta the angle from the geometric bow (positive on its lit
    side), x = 2 pi a / lambda, c half the second derivative of the scattering angle in the impact
    parameter (Humphreys 1929; van de Hulst 1957, 13.23). It gives the bow's width (narrow for big
    drops, broad and pale for drizzle), the supernumerary bands inside it, and the light falling off
    past it into the dark band. Away from the bow the geometric intensity is multiplied by Airy's
    over its own far-field form, so the two join.
  - Diffraction, half the light a drop takes from the beam, goes into a cone of a fraction of a
    degree about the Sun and is left out (the page's extinction counts it as passing through).
  - The drop sizes in a row are spread as a log-normal of 30 percent about the row's, which
    smooths the supernumeraries of big drops as real rain does; and the Sun's disk, 0.53 degrees
    across, blurs every angle (its chord's length across the bow).
  - The spectrum: the sunlight above the air (skymodel.py solar_spectrum), in 20 nm steps,
    weighted by the CIE 1931 functions into linear sRGB, divided by the sunlight's own. Bow colours
    outside sRGB are pulled toward grey of the same luminance until they fit.

Checked here against Lorenz-Mie theory for water spheres of 0.1 and 0.3 mm (x about 570 and
1,700 at 550 nm): the bow's peak angle, its width and the first supernumerary agree (see main).
Airy theory is known to misplace the supernumeraries by some tenths of a degree for drops under
0.1 mm; the page's drizzle row is broad anyway.

Run: python rainbow.py   (prints the epochs' bow radii and the Mie comparison)
"""
import numpy as np
from scipy.special import airy

import skymodel as sm

# Water's refractive index (IAPWS R9-97, Harvey et al. 1998) at wavelength lam (nm), T (C), with its
# density at 1 bar (Kell 1975).
def water_n(lam, T):
    rho = 1000*(1-(T+288.9414)/(508929.2*(T+68.12963))*(T-3.9863)**2)
    Tb, rb, lb = (T+273.15)/273.15, rho/1000, lam/589.0
    a = [0.244257733, 9.74634476e-3, -3.73234996e-3, 2.68678472e-4, 1.58920570e-3, 2.45934259e-3, 0.900704920, -1.66626219e-2]
    luv, lir = 0.2292020, 5.432937
    A = rb*(a[0]+a[1]*rb+a[2]*Tb+a[3]*lb**2*Tb+a[4]/lb**2+a[5]/(lb**2-luv**2)+a[6]/(lb**2-lir**2)+a[7]*rb**2)
    return np.sqrt((1+2*A)/(1-A))

# The air's refractivity at the surface ((n-1), 550 nm), from its gases' partial pressures (bar) at
# their STP values (airgrid.py REFRAC) at temperature T (C). Its dispersion is a hundredth of
# water's and is left out.
REFRAC = {'N2': 298, 'O2': 271, 'Ar': 281, 'CO2': 449, 'CH4': 444, 'H2O': 256}
def air_refractivity(gas, T):
    return sum(p*REFRAC[g] for g, p in gas.items())*1e-6*273.15/(T+273.15)


def deflection(m, i, k):
    r = np.arcsin(np.sin(i)/m)
    return 2*(i-(k+1)*r)+k*np.pi if k >= 0 else np.pi-2*i

def scat_angle(D):
    return np.arccos(np.cos(D))

def fresnel(m, i):
    r = np.arcsin(np.sin(i)/m)
    ci, cr = np.cos(i), np.cos(r)
    Rs = ((ci-m*cr)/(ci+m*cr))**2
    Rp = ((m*ci-cr)/(m*ci+cr))**2
    return Rs, Rp

def share(m, i, k):
    """The light a ray at incidence i carries out after k internal reflections (k=-1: reflected
    off the outside), for s and p polarisation."""
    Rs, Rp = fresnel(m, i)
    if k < 0:
        return Rs, Rp
    return (1-Rs)**2*Rs**k, (1-Rp)**2*Rp**k

def bow_point(m, k):
    """The geometric bow of order k: incidence, impact parameter, scattering angle (rad), c (half
    the second derivative of the scattering angle in b, its sign: + where the angle grows away)."""
    i = np.arccos(np.sqrt((m*m-1)/(k*(k+2))))
    b = np.sin(i)
    th = lambda bb: scat_angle(deflection(m, np.arcsin(bb), k))
    h = 1e-4
    c = (th(b+h)-2*th(b)+th(b-h))/h**2/2
    return i, b, float(th(b)), float(c)

def ai2(z):
    return airy(-z)[0]**2

def geometric(m, k, theta, pol_sum=True):
    """Geometric-optics phase function (per sr, normalised to the drop's cross-section) of order k
    on the grid theta (rad, ascending), every branch b(theta) summed, as s and p."""
    b = np.linspace(1e-6, 1-1e-9, 400001)
    th = scat_angle(deflection(m, np.arcsin(b), k))
    es, ep = share(m, np.arcsin(b), k)
    out_s, out_p = np.zeros_like(theta), np.zeros_like(theta)
    # Split into monotonic runs.
    d = np.sign(np.diff(th))
    cut = np.where(d[1:] != d[:-1])[0]+1
    edges = np.concatenate([[0], cut, [len(th)-1]])
    for a0, a1 in zip(edges[:-1], edges[1:]):
        tt, bb = th[a0:a1+1], b[a0:a1+1]
        if tt[-1] < tt[0]:
            tt, bb = tt[::-1], bb[::-1]
        sel = (theta > tt[0]) & (theta < tt[-1])
        if not sel.any():
            continue
        bi = np.interp(theta[sel], tt, bb)
        dth = np.gradient(tt, bb)
        dd = np.abs(np.interp(theta[sel], tt, dth))
        es_i, ep_i = share(m, np.arcsin(bi), k)
        w = bi/(np.pi*np.sin(theta[sel])*np.maximum(dd, 1e-12))
        out_s[sel] += es_i*w
        out_p[sel] += ep_i*w
    return out_s, out_p

def bow_order(m, k, theta, x):
    """Order k (1 or 2) with Airy theory about its bow, size parameter x, s and p."""
    gs, gp = geometric(m, k, theta)
    i_r, b_r, th_r, c = bow_point(m, k)
    side = np.sign(c)                       # the lit side is where the angle moves away from th_r
    cabs = abs(c)
    delta = (theta-th_r)*side
    z = delta*x**(2/3)/cabs**(1/3)
    es_r, ep_r = share(m, i_r, k)
    K = 2*b_r*x**(1/3)/(np.sin(th_r)*cabs**(2/3))
    A = ai2(z)
    lit = z > 0
    mod = np.where(lit, 2*np.pi*np.sqrt(np.maximum(z, 1e-12))*A, 0)
    s = np.where(lit, gs*mod, K*es_r*A)
    p = np.where(lit, gp*mod, K*ep_r*A)
    return s, p

def phase(m, theta, x):
    """All orders: external reflection, transmission, the bows (Airy), the tertiary; s+p mean."""
    tot = np.zeros_like(theta)
    for k in (-1, 0, 3):
        s, p = geometric(m, k, theta); tot += (s+p)/2
    for k in (1, 2):
        s, p = bow_order(m, k, theta, x); tot += (s+p)/2
    return tot


# ---------------- Lorenz-Mie, for the check ----------------
def mie_phase(m, x, theta):
    """(|S1|^2+|S2|^2)/(2 pi x^2): the phase function normalised to the geometric cross-section."""
    nmax = int(x+4.05*x**(1/3)+2)
    mx = m*x
    # Logarithmic derivative by downward recurrence.
    nst = int(max(nmax, abs(mx))+16)
    Dn = np.zeros(nst+1, complex)
    for n in range(nst, 0, -1):
        Dn[n-1] = n/mx-1/(Dn[n]+n/mx)
    psi0, psi1 = np.cos(x), np.sin(x)
    chi0, chi1 = -np.sin(x), np.cos(x)
    mu = np.cos(theta)
    pi0, pi1 = np.zeros_like(mu), np.ones_like(mu)
    S1 = np.zeros_like(mu, complex); S2 = np.zeros_like(mu, complex)
    for n in range(1, nmax+1):
        psi = (2*n-1)/x*psi1-psi0
        chi = (2*n-1)/x*chi1-chi0
        xi, xi1 = psi-1j*chi, psi1-1j*chi1
        an = ((Dn[n]/m+n/x)*psi-psi1)/((Dn[n]/m+n/x)*xi-xi1)
        bn = ((Dn[n]*m+n/x)*psi-psi1)/((Dn[n]*m+n/x)*xi-xi1)
        tau = n*mu*pi1-(n+1)*pi0
        f = (2*n+1)/(n*(n+1))
        S1 += f*(an*pi1+bn*tau); S2 += f*(an*tau+bn*pi1)
        pi0, pi1 = pi1, ((2*n+1)*mu*pi1-(n+1)*pi0)/n
        psi0, psi1, chi0, chi1 = psi1, psi, chi1, chi
    return (np.abs(S1)**2+np.abs(S2)**2)/(2*np.pi*x*x)


def smooth(theta, y, w):
    """Gaussian of standard deviation w (rad) along theta (uniform grid)."""
    d = theta[1]-theta[0]
    n = int(4*w/d)+1
    k = np.exp(-0.5*(np.arange(-n, n+1)*d/w)**2); k /= k.sum()
    return np.convolve(y, k, 'same')


def main():
    import epochs as E
    print('Bow radii (deg from the antisolar point) at 550 nm, rain at the epoch\'s mid-latitude mean temperature:')
    import re
    js = open(__file__.replace('rainbow.py', 'site_src/js/clouds.js'), encoding='utf-8').read()
    for e in E.EPOCHS:
        mm = re.search(e['key']+r':\{eq:([-\d.]+),grad:([\d.]+)', js)
        T = float(mm.group(1))-float(mm.group(2))*0.5 if mm else 12.0
        N = air_refractivity(e['gas'], T)
        m = water_n(550, T)/(1+N)
        r1 = 180-np.degrees(bow_point(m, 1)[2]); r2 = 180-np.degrees(bow_point(m, 2)[2])
        print(f"  {e['key']:16s} T {T:5.1f} C  air (n-1) {N*1e6:7.0f}e-6  m {m:.4f}  primary {r1:5.2f}  secondary {r2:5.2f}  band {r2-r1:5.2f}")
    print('\nAiry + geometric against Mie at 550 nm, 12 C (smoothed 0.05 deg), 120-145 deg scattering:')
    m = water_n(550, 12.0)/1.000275
    for D in (0.1, 0.3):
        x = 2*np.pi*(D*1e3/2)/0.55
        th = np.radians(np.arange(110, 150, 0.005))
        pa = smooth(th, phase(m, th, x), np.radians(0.05))
        pm = smooth(th, mie_phase(m, x, th), np.radians(0.05))
        sel = (th > np.radians(132)) & (th < np.radians(145))
        ia, im = np.argmax(np.where(sel, pa, 0)), np.argmax(np.where(sel, pm, 0))
        sel2 = (th > np.radians(122)) & (th < np.radians(132))
        ja, jm = np.argmax(np.where(sel2, pa, 0)), np.argmax(np.where(sel2, pm, 0))
        band = (th > np.radians(132)) & (th < np.radians(134))
        print(f'  D {D} mm (x {x:.0f}): primary peak {np.degrees(th[ia]):.2f} vs Mie {np.degrees(th[im]):.2f}, '
              f'height {pa[ia]:.3f} vs {pm[im]:.3f} /sr; secondary {np.degrees(th[ja]):.2f} vs {np.degrees(th[jm]):.2f}, '
              f'{pa[ja]:.4f} vs {pm[jm]:.4f}; dark band {pa[band].mean():.4f} vs {pm[band].mean():.4f}')
        for a in (100, 115, 150, 165, 175):
            j = np.argmin(abs(th-np.radians(a))) if a < 150 else None
        th2 = np.radians(np.array([60, 90, 100, 115, 150, 160, 170, 178.0]))
        print('    elsewhere (geometric vs Mie):', ', '.join(f'{np.degrees(t):.0f}: {phase(m, np.array([t]), x)[0]:.4f}/{mie_phase(m, x, np.array([t]))[0]:.4f}' for t in th2))


if __name__ == '__main__':
    main()
