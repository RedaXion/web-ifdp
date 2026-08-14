/**
 * IGLESIA FAMILIAS DE PAZ - OFFICIAL APPLICATION SCRIPT
 * San Felipe, Chile
 */

// Configuration Object for External Official Links & Data
const CONFIG_OFICIAL = {
  NOMBRE_IGLESIA: "Iglesia Familias de Paz",
  DIRECCION: "Las Heras 460, San Felipe, Chile",
  PASTORES: "Christopher Rodríguez & Jocelyn Valdenegro",
  COBERTURA: "CCINT — Centro Cristiano Internacional",
  
  // Dynamic Replaceable URLs (Configurables)
  WHATSAPP_URL: "https://wa.me/56944574436", // Reemplazar con nro real
  PHONE_NUMBER: "tel:+56944574436",
  INSTAGRAM_URL: "https://instagram.com/familiasdepaz",
  YOUTUBE_URL: "https://www.youtube.com/@iglesiafamiliasdepaz",
  ZOOM_URL: "https://zoom.us/j/0000000000",
  MAPS_URL: "https://maps.app.goo.gl/4VhWWrfdAqXyxSXX6"
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header Animation & Scroll Effect
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 2. Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (navMenu.classList.contains('active')) {
        icon.className = 'ri-close-line';
      } else {
        icon.className = 'ri-menu-line';
      }
    });

    // Close menu when clicking link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'ri-menu-line';
      });
    });
  }

  // 3. Smooth Scroll for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 90;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 4. Inject Dynamic Official Configuration into Links
  injectOfficialLinks();
});

function injectOfficialLinks() {
  document.querySelectorAll('[data-link="whatsapp"]').forEach(el => el.href = CONFIG_OFICIAL.WHATSAPP_URL);
  document.querySelectorAll('[data-link="phone"]').forEach(el => el.href = CONFIG_OFICIAL.PHONE_NUMBER);
  document.querySelectorAll('[data-link="instagram"]').forEach(el => el.href = CONFIG_OFICIAL.INSTAGRAM_URL);
  document.querySelectorAll('[data-link="youtube"]').forEach(el => el.href = CONFIG_OFICIAL.YOUTUBE_URL);
  document.querySelectorAll('[data-link="zoom"]').forEach(el => el.href = CONFIG_OFICIAL.ZOOM_URL);
  document.querySelectorAll('[data-link="maps"]').forEach(el => el.href = CONFIG_OFICIAL.MAPS_URL);
}
