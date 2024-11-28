# Background Remover with WebGPU

<img src="./public/banner.png" />

A powerful React + Vite application that removes backgrounds from image directly in your browser. This app leverages machine learning models through Transformers.js to process media locally, ensuring your files never leave your device.

## Features

- 🎯 One-click background removal for images
- 🔄 Interactive before/after comparison slider
- 🎨 Custom background color selection
- 💾 Download options for both transparent and colored backgrounds
- 🏃‍♂️ Local processing - no server uploads needed
- 🔒 Privacy-focused - all processing happens in your browser
- ⚡ WebGPU acceleration for supported browsers

## Technical Implementation

The app implements an adaptive approach to background removal based on browser capabilities:

### WebGPU-Supported Browsers
- Uses [MODNet](https://huggingface.co/Xenova/modnet), a lightweight portrait background removal model
- Leverages WebGPU acceleration for optimal performance
- Processes images directly on the GPU for faster results

### Non-WebGPU Browsers
- Falls back to [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model
- Ensures cross-browser compatibility
- Maintains functionality while adapting to available resources

Both implementations use Transformers.js to run the machine learning models directly in the browser, eliminating the need for server-side processing.

## How It Works

1. **File Selection**: Upload any image file
2. **Local Processing**: The app automatically detects your browser's capabilities and selects the appropriate model
3. **Background Removal**: The selected ML model processes your media, creating an alpha mask
4. **Interactive Results**: Use the slider to compare original and processed versions
5. **Customization**: Choose a custom background color or keep transparency
6. **Export**: Download your processed media with either transparent or colored background

## Getting Started

1. Clone the repository:
\`\`\`bash
git clone https://github.com/addyosmani/bg-remove.git
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Browser Support

- **Optimal Experience**: Browsers with WebGPU support (Chrome Canary with WebGPU flags enabled)
- **Compatible Experience**: All modern browsers (Chrome, Firefox, Safari, Edge)

## Technical Stack

- React + Vite for the frontend framework
- Transformers.js for ML model inference
- WebGPU API for GPU acceleration
- IndexedDB (via Dexie.js) for local file management
- TailwindCSS for styling

## Credits

Based on the [WebGPU background removal demo](https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-webgpu) by [@xenova](https://github.com/xenova)

## License

MIT License - feel free to use this in your own projects!
