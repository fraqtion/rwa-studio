import { useState, useEffect, Suspense, useRef } from 'react';
import {
  FILE_TYPES,
  PREVIEW_SUPPORTED_TYPES,
} from '@/common/interfaces/constants';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, useProgress } from '@react-three/drei';
import { FBXLoader } from 'three-stdlib';
import * as THREE from 'three';

interface AssetPreviewProps {
  file: {
    name: string;
    type: keyof typeof FILE_TYPES;
    preview_url?: string;
    content?: string;
  };
  className?: string;
}

// Separate components for different 3D file formats to avoid conditional hook calls
const GltfModel = ({ url }: { url: string }) => {
  const [error, setError] = useState<string | null>(null);

  // Always call useGLTF unconditionally
  const { scene } = useGLTF(url);

  // Handle errors with useEffect instead
  useEffect(() => {
    const handleError = () => {
      const errorMessage = `Failed to load GLTF model from ${url}`;
      console.error(errorMessage);
      setError(errorMessage);
    };

    // Add event listener to catch loading errors
    window.addEventListener('error', handleError, { once: true });

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [url]);

  if (error) {
    return (
      <Html center>
        <div className="bg-red-900 bg-opacity-80 p-4 rounded text-white">
          <h3 className="font-bold mb-2">Error loading GLTF model</h3>
          <p>{error}</p>
        </div>
      </Html>
    );
  }

  return <primitive object={scene} />;
};

const FbxModel = ({
  url,
  file,
}: {
  url: string;
  file: { content?: string; type: string };
}) => {
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loader = new FBXLoader();

    const loadModel = async () => {
      setIsLoading(true);
      try {
        // If we have direct content, use it instead of fetching the URL
        if (file.content && file.type === '.fbx') {
          try {
            // Check if content is a data URL
            if (file.content.startsWith('data:')) {
              // Extract the base64 part from the data URL
              const base64Content = file.content.split(',')[1];
              if (base64Content) {
                // Convert base64 to binary
                const binaryString = atob(base64Content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                // Parse the binary data directly
                const fbx = loader.parse(bytes.buffer, '');
                processModel(fbx);
                return;
              }
            }

            // If not a data URL, assume it's a base64 string
            try {
              // Convert base64 to binary
              const binaryString = atob(file.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Parse the binary data directly
              const fbx = loader.parse(bytes.buffer, '');
              processModel(fbx);
              return;
            } catch (err) {
              console.error('Error parsing base64 content:', err);
              // Fall back to URL loading if base64 parsing fails
            }
          } catch (err) {
            console.error('Error processing content directly:', err);
            // Fall back to URL loading if direct processing fails
          }
        }

        // Fall back to URL loading if direct processing isn't possible or fails
        // Create a new XMLHttpRequest to fetch the model with proper error handling
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function () {
          if (xhr.status === 200) {
            try {
              const arrayBuffer = xhr.response;
              const fbx = loader.parse(arrayBuffer, '');
              processModel(fbx);
            } catch (err) {
              console.error('Error parsing FBX model:', err);
              setError(
                `Error parsing FBX model: ${err instanceof Error ? err.message : String(err)}`,
              );
              setIsLoading(false);
            }
          } else {
            setError(`Failed to load model: HTTP status ${xhr.status}`);
            setIsLoading(false);
          }
        };

        xhr.onerror = function () {
          setError('Network error occurred while loading the model');
          setIsLoading(false);
        };

        xhr.send();
      } catch (err) {
        console.error('Error loading FBX:', err);
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    };

    // Helper function to process the loaded model
    const processModel = (fbx: THREE.Group) => {
      try {
        // Center the model
        const box = new THREE.Box3().setFromObject(fbx);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale the model to fit in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        fbx.scale.multiplyScalar(scale);

        // Center the model
        fbx.position.sub(center.multiplyScalar(scale));

        setModel(fbx);
        setIsLoading(false);
      } catch (err) {
        console.error('Error processing FBX model:', err);
        setError(
          `Error processing FBX model: ${err instanceof Error ? err.message : String(err)}`,
        );
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      // Cleanup if needed
    };
  }, [url, file]);

  if (error) {
    return (
      <Html center>
        <div className="bg-red-900 bg-opacity-80 p-4 rounded text-white">
          <h3 className="font-bold mb-2">Error loading FBX model</h3>
          <p>{error}</p>
        </div>
      </Html>
    );
  }

  if (isLoading || !model) {
    return (
      <Html center>
        <div className="bg-gray-800 p-4 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading FBX model...</p>
        </div>
      </Html>
    );
  }

  return <primitive object={model} />;
};

const UnsupportedModel = () => (
  <Html center>
    <div className="bg-gray-800 p-4 rounded">
      <p>Preview not available for this 3D format</p>
    </div>
  </Html>
);

// Model component that renders the appropriate model based on file type
const Model = ({
  url,
  fileType,
  file,
}: {
  url: string;
  fileType: string;
  file: AssetPreviewProps['file'];
}) => {
  if (fileType === '.gltf' || fileType === '.glb') {
    return <GltfModel url={url} />;
  } else if (fileType === '.fbx') {
    return <FbxModel url={url} file={file} />;
  } else {
    return <UnsupportedModel />;
  }
};

const ImagePreview = ({
  url,
  alt,
  content,
}: {
  url: string;
  alt: string;
  content?: string;
}) => {
  const [error, setError] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if the image is already loaded (for cached images)
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoading(false);
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Reset loading state when URL or content changes
    if (!imageLoaded) {
      setIsLoading(true);
    }
    setError(false);

    // If we have content, try to create a data URL immediately
    if (content) {
      try {
        // Check if content is already a data URL
        if (content.startsWith('data:')) {
          setDataUrl(content);
          console.log('Content is already a data URL');
          // Set loading to false since we have the data URL ready
          setIsLoading(false);
          return;
        }

        // Try to convert base64 to data URL
        if (content.match(/^[A-Za-z0-9+/=]+$/)) {
          // Determine MIME type based on file extension in alt (filename)
          let mimeType = 'image/png'; // Default
          if (alt.endsWith('.jpg') || alt.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          } else if (alt.endsWith('.gif')) {
            mimeType = 'image/gif';
          } else if (alt.endsWith('.webp')) {
            mimeType = 'image/webp';
          } else if (alt.endsWith('.svg')) {
            mimeType = 'image/svg+xml';
          }

          const newDataUrl = `data:${mimeType};base64,${content}`;
          console.log('Created data URL from base64 content');
          setDataUrl(newDataUrl);
          // Set loading to false since we have created the data URL
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error creating data URL from content:', err);
        setIsLoading(false);
        setError(true);
      }
    }
  }, [url, content, alt, imageLoaded]);

  // If URL is a data URL, set loading to false immediately
  useEffect(() => {
    if (url && url.startsWith('data:')) {
      console.log('URL is already a data URL');
      setIsLoading(false);
    }
  }, [url]);

  if (error && !dataUrl) {
    return (
      <div className="text-center text-red-500">
        <p>Failed to load image</p>
        <p className="text-sm mt-2">{url}</p>
        {content && (
          <p className="text-sm mt-2">Trying to use content directly...</p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <img
        ref={imgRef}
        src={dataUrl || url}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onLoad={() => {
          console.log('Image loaded successfully');
          setIsLoading(false);
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('Failed to load image from URL:', dataUrl || url, e);
          if (!dataUrl && content) {
            // If URL failed and we haven't tried content yet, try to create a data URL
            setError(true);
          } else if (dataUrl) {
            // If data URL also failed, show error
            setError(true);
          }
        }}
      />
    </div>
  );
};

const AudioPreview = ({ url, name }: { url: string; name: string }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <div className="mb-4 text-gray-400">{name}</div>
    <audio controls className="w-full max-w-md">
      <source src={url} />
      Your browser does not support the audio element.
    </audio>
  </div>
);

const VideoPreview = ({ url, name }: { url: string; name: string }) => (
  <div className="flex flex-col items-center h-full">
    <div className="mb-2 text-gray-400">{name}</div>
    <video
      controls
      className="max-w-full max-h-[calc(100%-2rem)] object-contain"
    >
      <source src={url} />
      Your browser does not support the video element.
    </video>
  </div>
);

const HtmlPreview = ({ content }: { content: string }) => (
  <iframe
    srcDoc={content}
    className="w-full h-full border-0"
    sandbox="allow-scripts"
    title="HTML Preview"
  />
);

// Loading component for 3D models with progress indicator
const ModelLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="bg-gray-800 p-4 rounded">
        <p>Loading 3D model... {progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
};

export default function AssetPreview({
  file,
  className = '',
}: AssetPreviewProps) {
  const [previewType, setPreviewType] = useState<
    (typeof PREVIEW_SUPPORTED_TYPES)[number] | null
  >(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fileType = FILE_TYPES[file.type];
    setIsLoading(true);
    setError(null);

    if (
      PREVIEW_SUPPORTED_TYPES.includes(
        fileType as (typeof PREVIEW_SUPPORTED_TYPES)[number],
      )
    ) {
      setPreviewType(fileType as (typeof PREVIEW_SUPPORTED_TYPES)[number]);
    } else {
      setPreviewType(null);
    }

    // Simulate loading completion
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [file.type, file.preview_url]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!previewType || (previewType !== 'html' && !file.preview_url)) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No preview available</p>
      </div>
    );
  }

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Loading asset preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <p className="text-xl mb-2">Error loading asset</p>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    switch (previewType) {
      case 'image':
        console.log('Image preview:', {
          name: file.name,
          preview_url: file.preview_url,
          hasContent: !!file.content,
          contentLength: file.content?.length || 0,
          contentStart: file.content?.substring(0, 50),
        });

        // If we have content but no preview_url, we can still render
        if (!file.preview_url && file.content) {
          return <ImagePreview url="" alt={file.name} content={file.content} />;
        }

        return (
          file.preview_url && (
            <ImagePreview
              url={file.preview_url}
              alt={file.name}
              content={file.content}
            />
          )
        );
      case 'audio':
        return (
          file.preview_url && (
            <AudioPreview url={file.preview_url} name={file.name} />
          )
        );
      case 'video':
        return (
          file.preview_url && (
            <VideoPreview url={file.preview_url} name={file.name} />
          )
        );
      case '3d':
        // Special handling for FBX files
        if (file.type === '.fbx') {
          return (
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <directionalLight position={[-5, 5, 5]} intensity={0.5} />
              <Suspense fallback={<ModelLoader />}>
                <Model
                  url={file.preview_url || ''}
                  fileType={file.type}
                  file={file}
                />
              </Suspense>
              <OrbitControls makeDefault />
              <gridHelper args={[10, 10]} />
            </Canvas>
          );
        }

        return (
          file.preview_url && (
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <directionalLight position={[-5, 5, 5]} intensity={0.5} />
              <Suspense fallback={<ModelLoader />}>
                <Model
                  url={file.preview_url}
                  fileType={file.type}
                  file={file}
                />
              </Suspense>
              <OrbitControls makeDefault />
              <gridHelper args={[10, 10]} />
            </Canvas>
          )
        );
      case 'html':
        return (
          <HtmlPreview
            content={
              file.content || '<html><body>Empty HTML file</body></html>'
            }
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              No preview available for this file type
            </p>
          </div>
        );
    }
  };

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-gray-900 p-4'
    : `relative ${className}`;

  return (
    <div className={containerClasses}>
      {/* Asset preview toolbar */}
      <div className="absolute top-0 right-0 z-10 p-2 flex space-x-2 bg-gray-800 bg-opacity-75 rounded-bl">
        <button
          onClick={toggleFullscreen}
          className="p-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 5h4V3H3v6h2V5zm10 0v4h2V3h-6v2h4zm-10 10H3v-6h2v4h4v2H5zm10 0v-2h4v-4h2v6h-6z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {previewType === '3d' && (
          <button
            className="p-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
            title="Reset Camera"
            onClick={() => {
              // This is a placeholder - we would need to implement camera reset functionality
              console.log('Reset camera');
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Asset info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gray-800 bg-opacity-75 text-white text-sm flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-medium mr-2">{file.name}</span>
          <span className="text-gray-400 text-xs">
            {previewType === 'image' && 'Image'}
            {previewType === '3d' && '3D Model'}
            {previewType === 'audio' && 'Audio'}
            {previewType === 'video' && 'Video'}
            {previewType === 'html' && 'HTML'}
          </span>
        </div>
        <div>{file.type}</div>
      </div>

      {/* Main content */}
      <div className="h-full w-full">{renderPreviewContent()}</div>
    </div>
  );
}
