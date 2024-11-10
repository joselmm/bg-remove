import React, { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Image } from "../db";
import { FaTrash, FaPalette, FaDownload, FaImage } from "react-icons/fa";

export function Images() {
  const images = useLiveQuery(() => db.images.reverse().toArray());

  return (
    <div>
      <h2>Images: {images?.length}</h2>
      <div className="gap-2 grid grid-cols-4">
        {images?.map((image) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return <ImageSpot image={image} key={image.id} />;
          }
        })}
      </div>
    </div>
  );
}

function Video({ video }: { video: Image }) {
  const imageProcessed = video.processedFile instanceof File;
  const url = URL.createObjectURL(video.file);
  return (
    <div className="">
      <video
        className="rounded-lg aspect-square object-cover"
        loop
        muted
        autoPlay
        src={url}
      ></video>
    </div>
  );
}

function ImageSpot({ image }: { image: Image }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [useImageBg, setUseImageBg] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportUrl, setExportUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageProcessed = image.processedFile instanceof File;
  const url = URL.createObjectURL(image.file);
  const processedURL = imageProcessed && image.processedFile ? URL.createObjectURL(image.processedFile) : "";

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, x)));
  };

  const handleBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBgImage(e.target?.result as string);
        setUseImageBg(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const createBackground = async () => {
    if (!imageProcessed || !image.processedFile) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const processedImg = new Image();
    processedImg.src = processedURL;
    await new Promise(resolve => processedImg.onload = resolve);
    
    canvas.width = processedImg.width;
    canvas.height = processedImg.height;
    
    if (useImageBg && bgImage) {
      // Draw background image
      const bgImg = new Image();
      bgImg.src = bgImage;
      await new Promise(resolve => bgImg.onload = resolve);
      
      // Scale and center the background image to cover the canvas
      const scale = Math.max(
        canvas.width / bgImg.width,
        canvas.height / bgImg.height
      );
      const x = (canvas.width - bgImg.width * scale) / 2;
      const y = (canvas.height - bgImg.height * scale) / 2;
      
      ctx.drawImage(
        bgImg,
        x,
        y,
        bgImg.width * scale,
        bgImg.height * scale
      );
    } else {
      // Draw background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw the processed image
    ctx.drawImage(processedImg, 0, 0);
    
    // Create URL for download
    const dataUrl = canvas.toDataURL('image/png');
    setExportUrl(dataUrl);
  };

  useEffect(() => {
    if (imageProcessed) {
      createBackground();
    }
  }, [bgColor, bgImage, useImageBg, imageProcessed]);

  return (
    <div>
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <div className="grid">
          <img
            className="rounded-lg w-full aspect-square object-cover col-start-1 row-start-1"
            src={url}
            alt={`Original image ${image.id}`}
          />
          <div className="col-start-1 row-start-1 relative">
            <img
              className="rounded-lg w-full aspect-square object-cover"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                backgroundColor: useImageBg ? undefined : bgColor,
                backgroundImage: useImageBg && bgImage ? `url(${bgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              src={processedURL}
              alt={`Processed image ${image.id}`}
            />
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
              style={{ left: `${sliderPosition}%` }}
            />
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleSliderChange}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4"
        />
      </div>
      <div className="controls mt-2 flex gap-2 items-center">
        <button 
          onClick={() => db.images.delete(image.id)}
          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          title="Delete"
        >
          <FaTrash className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setUseImageBg(false);
            }}
            className={`p-2 ${useImageBg ? 'bg-gray-600' : 'bg-blue-600'} text-white rounded-full hover:bg-blue-700 transition-colors`}
            title="Background Color"
          >
            <FaPalette className="w-4 h-4" />
          </button>
          {showColorPicker && (
            <div className="absolute mt-2 z-10">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 cursor-pointer"
              />
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleBgImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 ${useImageBg ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-full hover:bg-blue-700 transition-colors`}
            title="Background Image"
          >
            <FaImage className="w-4 h-4" />
          </button>
        </div>
        {exportUrl && (
          <a
            href={exportUrl}
            download={`colored-bg-${image.id}.png`}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center gap-1"
            title="Download with Background"
          >
            <FaDownload className="w-4 h-4" />
          </a>
        )}
        {processedURL && (
          <a 
            href={processedURL} 
            download={`transparent-bg-${image.id}.png`}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center gap-1"
            title="Download Original"
          >
            <FaDownload className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
