// Wait for DOM to be ready before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
  // MOBILE MENU TOGGLE
  const mobileMenuButton = document.getElementById('mobile-menu');
  const mobileMenuLinksContainer = document.getElementById('mobile-menu-links');
  if (mobileMenuButton && mobileMenuLinksContainer) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenuLinksContainer.classList.toggle('hidden');
      // Update aria-expanded for accessibility
      const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
      mobileMenuButton.setAttribute('aria-expanded', !expanded);
    });
  }

  // SMOOTH SCROLL FOR ANCHOR LINKS
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

});
