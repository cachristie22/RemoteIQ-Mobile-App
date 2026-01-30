/**
 * RemoteIQ Branding Configuration
 * Determines branding based on URL hostname or path
 */

const BRANDS = {
    // Default RemoteIQ branding
    remoteiq: {
        name: 'RemoteIQ',
        logo: 'https://files.onlosant.com/6254b63150e14fb6deb3aa31/navbar-logo.svg',
        subBranding: null,
        themeColor: '#0891b2'
    },
    // Sage Pump / Sage Rental Services
    sage: {
        name: 'Sage Pump',
        logo: 'https://sagerentalservices.com/wp-content/uploads/2021/08/logo.png',
        subBranding: 'powered by RemoteIQ',
        themeColor: '#0891b2'
    }
};

/**
 * Detect which brand to use based on URL
 */
function detectBrand() {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    // Check for sage in URL
    if (hostname.includes('sage') || pathname.includes('sage') || search.includes('brand=sage')) {
        return BRANDS.sage;
    }

    // Default to RemoteIQ
    return BRANDS.remoteiq;
}

/**
 * Apply branding to the page
 */
function applyBranding() {
    const brand = detectBrand();

    // Update logo images
    document.querySelectorAll('.header-logo, .login-logo').forEach(img => {
        img.src = brand.logo;
        img.alt = brand.name;
    });

    // Update page title
    document.title = document.title.replace('RemoteIQ', brand.name);

    // Add or update sub-branding
    const existingSubBrand = document.querySelector('.sub-branding');
    if (brand.subBranding) {
        if (existingSubBrand) {
            existingSubBrand.textContent = brand.subBranding;
        } else {
            // Add sub-branding after logo in header
            const header = document.querySelector('.header h1');
            if (header) {
                const subBrand = document.createElement('span');
                subBrand.className = 'sub-branding';
                subBrand.textContent = brand.subBranding;
                header.appendChild(subBrand);
            }
        }
    } else if (existingSubBrand) {
        existingSubBrand.remove();
    }

    // Update Cattron branding on login page
    const cattronBranding = document.querySelector('.cattron-branding');
    if (cattronBranding && brand.subBranding) {
        cattronBranding.innerHTML = `${brand.subBranding}<br><span style="margin-top: 4px; display: block;">a service of <strong>Cattron Global</strong></span>`;
    }

    // Store brand for other pages
    sessionStorage.setItem('currentBrand', JSON.stringify(brand));

    return brand;
}

// Auto-apply branding on page load
document.addEventListener('DOMContentLoaded', applyBranding);

// Export for use
window.Branding = { detectBrand, applyBranding, BRANDS };
