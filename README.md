# 💼 Asif Ahamed Siddique - Portfolio

> AI & ML Engineer | Applied Artificial Intelligence

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://asifahamed3720.github.io)
[![GitHub](https://img.shields.io/badge/github-asifahamed3720-blue)](https://github.com/asifahamed3720)
[![LinkedIn](https://img.shields.io/badge/linkedin-connect-0077b5)](https://www.linkedin.com/in/asif-ahamed-709279379)

---

## 🌟 About

A modern, responsive portfolio website showcasing my projects and skills in AI, Machine Learning, and Full-Stack Development. Built with vanilla JavaScript ES6 modules, clean HTML, and modular CSS.

**Live Site:** [asifahamed3720.github.io](https://asifahamed3720.github.io)

---

## ✨ Features

### 🎨 **Interactive Design**
- **3D Card Tilt Effect** - Cards respond to mouse movement with realistic 3D rotation
- **Dynamic Cursor Shadows** - Shadows follow cursor position for immersive lighting
- **Image Hover Effects** - Project images slide out smoothly on hover
- **Lightbox Gallery** - Click images for full-screen view with smooth animations

### 🚀 **Performance**
- **Modular ES6 JavaScript** - Clean, maintainable code split into logical modules
- **Optimized Animations** - GPU-accelerated CSS transforms
- **Responsive Design** - Mobile-first approach with breakpoints at 480px, 768px, 1024px
- **Fast Loading** - Minimal dependencies, no external libraries required

### 📱 **Mobile Optimized**
- Automatic effect disabling on mobile for better performance
- Touch-friendly interface
- Responsive images with smart scaling
- Reduced motion support for accessibility

### 🎯 **Projects Showcase**
Four featured projects:
1. **From Normals to Mesh** - 3D reconstruction pipeline (Computer Vision)
2. **Balance Buddy** - Android budgeting app (Mobile Development)
3. **SEATRU Platform** - Crowdfunding web platform (Full-Stack)
4. **Intelligent Web Crawler** - AI-powered crawler (Machine Learning)

---

## 🏗️ Architecture

### **Modular Structure**
```
portfolio/
├── index.html                    # Main HTML file
├── css/
│   ├── main.css                  # CSS entry point (imports all modules)
│   ├── base.css                  # Variables, typography, global styles
│   ├── animations.css            # Keyframe animations
│   ├── responsive.css            # Media queries
│   └── components/
│       ├── cards.css             # Project card styles
│       ├── images.css            # Image positioning & effects
│       ├── lightbox.css          # Lightbox modal
│       └── dynamic-shadows.css   # Cursor-based shadows
├── js/
│   ├── main.js                   # Application entry point
│   ├── constants.js              # Configuration values
│   ├── utils.js                  # Shared helper functions
│   └── modules/
│       ├── card-manager.js       # Card width & scaling logic
│       ├── lightbox.js           # Image lightbox functionality
│       ├── card-tilt.js          # 3D tilt effect
│       └── dynamic-shadows.js    # Dynamic shadow system
├── images/                       # Project screenshots
└── Files/                        # Resume PDF
```

### **Design Principles**
- ✅ **Separation of Concerns** - Each module has a single responsibility
- ✅ **DRY (Don't Repeat Yourself)** - Shared logic in utilities
- ✅ **Feature Flags** - Easy enable/disable of effects
- ✅ **Performance First** - Debounced events, cached selectors
- ✅ **Accessibility** - Semantic HTML, keyboard navigation, reduced motion

---

## 🛠️ Technologies

### **Frontend**
- **HTML5** - Semantic markup
- **CSS3** - Modern features (Grid, Flexbox, Custom Properties, Transforms)
- **JavaScript ES6+** - Modules, Classes, Arrow Functions, Async/Await

### **Key Features**
- **ES6 Modules** - Native browser module system
- **CSS Custom Properties** - Dynamic theming
- **Intersection Observer** - Scroll animations
- **CSS Transforms** - 3D effects and animations

### **No Build Tools Required**
- Pure vanilla JavaScript (no frameworks)
- No npm, webpack, or bundlers needed
- Works directly on GitHub Pages
- Instant deployment

---

## 🚀 Quick Start

### **View Live**
Simply visit: [asifahamed3720.github.io](https://asifahamed3720.github.io)

### **Run Locally**
Since this uses ES6 modules, you need a local server:

**Option 1: Python**
```bash
cd portfolio
python -m http.server 8000
# Open http://localhost:8000
```

**Option 2: Node.js**
```bash
cd portfolio
npx serve
# Open http://localhost:3000
```

**Option 3: VS Code**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

> ⚠️ **Note:** Double-clicking `index.html` won't work due to CORS restrictions with ES6 modules. Use a local server.

---

## 📂 Project Structure Explained

### **CSS Organization**
```css
/* main.css - Entry point */
@import './base.css';              /* Variables, resets, typography */
@import './animations.css';        /* Keyframes */
@import './components/cards.css';  /* Project cards */
@import './components/images.css'; /* Image effects */
@import './components/lightbox.css'; /* Modal */
@import './components/dynamic-shadows.css'; /* Shadows */
@import './responsive.css';        /* Media queries */
```

### **JavaScript Organization**
```javascript
// main.js - Entry point
import { FEATURES } from './constants.js';
import cardManager from './modules/card-manager.js';
import lightbox from './modules/lightbox.js';
import cardTilt from './modules/card-tilt.js';
import dynamicShadows from './modules/dynamic-shadows.js';

// Initialize all features
cardManager.init();
lightbox.init();
cardTilt.init();
dynamicShadows.init();
```

---

## ⚙️ Configuration

Easily customize features in `js/constants.js`:

```javascript
// Feature flags
export const FEATURES = {
  cardTilt: true,          // 3D tilt effect
  dynamicShadows: true,    // Cursor-based shadows
  lightbox: true,          // Image lightbox
};

// Card configuration
export const CARD_CONFIG = {
  imageWidth: 220,         // Image width in pixels
  edgeGap: 48,            // Gap from screen edge
  minImageScale: 0.4      // Minimum scale factor
};

// Tilt configuration
export const TILT_CONFIG = {
  maxRotationX: 8,        // Max X rotation (degrees)
  maxRotationY: 8,        // Max Y rotation (degrees)
  translateY: -10         // Lift amount (pixels)
};
```

---

## 🎨 Customization

### **Change Colors**
Edit `css/base.css`:
```css
:root {
  --primary-blue: #4da3ff;
  --primary-purple: #8f7bff;
  --bg-dark: #0a0a0a;
  /* ... more variables */
}
```

### **Add New Projects**
Add to `index.html`:
```html
<div class="project-wrapper">
  <img src="images/left.png" class="project-image left" alt="...">
  <img src="images/right.png" class="project-image right" alt="...">
  
  <div class="project-card">
    <h3>Project Name</h3>
    <p class="project-subtitle">Description</p>
    <p>Full project description...</p>
    
    <ul>
      <li>Feature 1</li>
      <li>Feature 2</li>
    </ul>
    
    <p class="tech">
      <strong>Tech:</strong> React, Node.js, MongoDB
    </p>
  </div>
</div>
```

### **Disable Features**
Edit `js/constants.js`:
```javascript
export const FEATURES = {
  cardTilt: false,         // Disable 3D tilt
  dynamicShadows: false,   // Disable dynamic shadows
  lightbox: true,          // Keep lightbox
};
```

---

## 📱 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 61+ | ✅ Full |
| Firefox | 60+ | ✅ Full |
| Safari | 11+ | ✅ Full |
| Edge | 16+ | ✅ Full |
| Mobile Safari | iOS 11+ | ✅ Full |
| Chrome Mobile | Latest | ✅ Full |

**ES6 Module Support Required** - All modern browsers supported

---

## 🤝 Contributing

This is a personal portfolio, but suggestions are welcome! If you find a bug or have an improvement idea:

1. Open an issue describing the problem/suggestion
2. Feel free to fork and submit a pull request

---

## 📄 License

Feel free to use this code as inspiration for your own portfolio, but please don't copy it entirely. Make it your own! 🎨

---

## 📬 Contact

**Asif Ahamed Siddique**

- 🌐 Portfolio: [asifahamed3720.github.io](https://asifahamed3720.github.io)
- 💼 LinkedIn: [linkedin.com/in/asif-ahamed-709279379](https://www.linkedin.com/in/asif-ahamed-709279379)
- 💻 GitHub: [@Asifahamed3720](https://github.com/Asifahamed3720)
- 📧 Email: asif.ahamed3720@gmail.com

---

## 🙏 Acknowledgments

- **Design Inspiration**: Modern web design trends, glassmorphism
- **Icons**: SVG icons inline (no external dependencies)
- **Fonts**: System fonts for optimal performance

---

## 📊 Stats

![Code Size](https://img.shields.io/github/languages/code-size/asifahamed3720/asifahamed3720.github.io)
![Last Commit](https://img.shields.io/github/last-commit/asifahamed3720/asifahamed3720.github.io)
![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fasifahamed3720.github.io)

---

<div align="center">

**Built with ❤️ by Asif Ahamed Siddique**


</div>
