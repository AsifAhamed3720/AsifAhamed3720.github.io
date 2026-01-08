// Dynamic cursor-based lighting and shadows
function setupDynamicShadows() {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  
  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Update all project cards
    document.querySelectorAll('.project-card').forEach(card => {
      updateCardShadow(card, mouseX, mouseY);
    });
    
    // Update all project images (both regular and FYP flower images)
    document.querySelectorAll('.project-image, .fyp-flower-image').forEach(image => {
      updateImageShadow(image, mouseX, mouseY);
    });
  });
  
  // Initialize shadows for all cards
  document.querySelectorAll('.project-card').forEach(card => {
    updateCardShadow(card, mouseX, mouseY);
  });
  
  // Initialize shadows for all images
  document.querySelectorAll('.project-image, .fyp-flower-image').forEach(image => {
    updateImageShadow(image, mouseX, mouseY);
  });
  
  // Update on window resize
  window.addEventListener('resize', () => {
    document.querySelectorAll('.project-card').forEach(card => {
      updateCardShadow(card, mouseX, mouseY);
    });
    
    document.querySelectorAll('.project-image, .fyp-flower-image').forEach(image => {
      updateImageShadow(image, mouseX, mouseY);
    });
  });
}

function updateCardShadow(card, mouseX, mouseY) {
  const rect = card.getBoundingClientRect();
  const cardCenterX = rect.left + rect.width / 2;
  const cardCenterY = rect.top + rect.height / 2;
  
  // Calculate vector from cursor to card center
  const deltaX = cardCenterX - mouseX;
  const deltaY = cardCenterY - mouseY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Prevent division by zero
  if (distance === 0) {
    card.style.setProperty('--shadow-x', '0px');
    card.style.setProperty('--shadow-y', '20px');
    card.style.setProperty('--shadow-blur', '40px');
    card.style.setProperty('--shadow-spread', '0px');
    card.style.setProperty('--shadow-opacity', '0.5');
    card.style.setProperty('--glow-opacity', '0.15');
    return;
  }
  
  // Shadow offset - card casts shadow away from cursor (light source)
  // Normalize the direction vector and scale it
  const maxShadowDistance = 50; // Maximum shadow offset in pixels
  const shadowIntensity = Math.min(1, 800 / distance); // Closer cursor = stronger effect
  
  const shadowX = (deltaX / distance) * maxShadowDistance * shadowIntensity;
  const shadowY = (deltaY / distance) * maxShadowDistance * shadowIntensity;
  
  // Shadow blur - closer cursor = sharper shadow, farther = more blur
  const minBlur = 15;
  const maxBlur = 60;
  const blurRange = maxBlur - minBlur;
  const shadowBlur = maxBlur - (blurRange * shadowIntensity);
  
  // Shadow spread - negative to make shadow appear more realistic
  const shadowSpread = -5;
  
  // Shadow opacity - closer cursor = darker shadow
  const minOpacity = 0.2;
  const maxOpacity = 0.7;
  const opacityRange = maxOpacity - minOpacity;
  const shadowOpacity = minOpacity + (opacityRange * shadowIntensity);
  
  // Glow effect on the side facing the cursor (light source)
  // Opposite direction from shadow
  const glowIntensity = Math.min(1, 600 / distance);
  const glowOpacity = glowIntensity * 0.25; // Subtle glow
  
  // Apply CSS custom properties
  card.style.setProperty('--shadow-x', `${shadowX}px`);
  card.style.setProperty('--shadow-y', `${shadowY}px`);
  card.style.setProperty('--shadow-blur', `${shadowBlur}px`);
  card.style.setProperty('--shadow-spread', `${shadowSpread}px`);
  card.style.setProperty('--shadow-opacity', shadowOpacity);
  card.style.setProperty('--glow-opacity', glowOpacity);
  
  // Calculate light angle for gradient glow (optional enhancement)
  const angle = Math.atan2(-deltaY, -deltaX) * (180 / Math.PI);
  card.style.setProperty('--light-angle', `${angle}deg`);
}

function updateImageShadow(image, mouseX, mouseY) {
  const rect = image.getBoundingClientRect();
  const imageCenterX = rect.left + rect.width / 2;
  const imageCenterY = rect.top + rect.height / 2;
  
  // Calculate vector from cursor to image center
  const deltaX = imageCenterX - mouseX;
  const deltaY = imageCenterY - mouseY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Prevent division by zero
  if (distance === 0) {
    image.style.setProperty('--img-shadow-x', '0px');
    image.style.setProperty('--img-shadow-y', '15px');
    image.style.setProperty('--img-shadow-blur', '30px');
    image.style.setProperty('--img-shadow-opacity', '0.4');
    image.style.setProperty('--img-glow-opacity', '0.2');
    return;
  }
  
  // Shadow offset for images - slightly different than cards for variety
  const maxShadowDistance = 40; // Slightly less than cards
  const shadowIntensity = Math.min(1, 700 / distance);
  
  const shadowX = (deltaX / distance) * maxShadowDistance * shadowIntensity;
  const shadowY = (deltaY / distance) * maxShadowDistance * shadowIntensity;
  
  // Shadow blur
  const minBlur = 12;
  const maxBlur = 50;
  const blurRange = maxBlur - minBlur;
  const shadowBlur = maxBlur - (blurRange * shadowIntensity);
  
  // Shadow opacity for images
  const minOpacity = 0.3;
  const maxOpacity = 0.7;
  const opacityRange = maxOpacity - minOpacity;
  const shadowOpacity = minOpacity + (opacityRange * shadowIntensity);
  
  // Glow effect for images
  const glowIntensity = Math.min(1, 500 / distance);
  const glowOpacity = glowIntensity * 0.4; // More pronounced glow on images
  
  // Apply CSS custom properties to images
  image.style.setProperty('--img-shadow-x', `${shadowX}px`);
  image.style.setProperty('--img-shadow-y', `${shadowY}px`);
  image.style.setProperty('--img-shadow-blur', `${shadowBlur}px`);
  image.style.setProperty('--img-shadow-opacity', shadowOpacity);
  image.style.setProperty('--img-glow-opacity', glowOpacity);
  
  // Calculate light angle
  const angle = Math.atan2(-deltaY, -deltaX) * (180 / Math.PI);
  image.style.setProperty('--img-light-angle', `${angle}deg`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDynamicShadows);
} else {
  setupDynamicShadows();
}
