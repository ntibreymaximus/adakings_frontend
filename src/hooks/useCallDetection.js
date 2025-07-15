import { useState, useEffect, useCallback } from 'react';
import Tesseract from 'tesseract.js';

/**
 * Custom hook for detecting incoming calls on mobile devices
 * Uses various Web APIs to detect call state changes
 */
export const useCallDetection = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [detectedNumber, setDetectedNumber] = useState('');
  const [callDetectionEnabled, setCallDetectionEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrAttempts, setOcrAttempts] = useState(0);

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
  };

  // Check if we're on a mobile device and can potentially detect calls
  const isCallDetectionSupported = () => {
    return isMobile() && (
      'connection' in navigator || 
      'onLine' in navigator || 
      'getBattery' in navigator ||
      'deviceMemory' in navigator ||
      'hardwareConcurrency' in navigator
    );
  };

  // Format phone number to Ghana format
  const formatPhoneNumber = useCallback((number) => {
    if (!number) return '';
    
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // 0XXXXXXXXX format
      return cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('233')) {
      // 233XXXXXXXXX format
      return '+' + cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('1233')) {
      // Sometimes +233 comes as 1233
      return '+' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // XXXXXXXXX format (missing country code)
      return '0' + cleaned;
    }
    
    return cleaned;
  }, []);

  // Capture and process phone numbers using OCR
  const detectPhoneNumber = useCallback(async (source = 'screen') => {
    if (isProcessing || ocrAttempts > 3) return;
    
    setIsProcessing(true);
    console.log(`📱 Attempting to detect phone number from ${source}...`);
    
    try {
      let stream;
      
      // For mobile devices, try camera first since screen capture might not be available
      if (isMobile() && source === 'screen') {
        source = 'camera';
      }
      
      // Try screen capture first (for detecting numbers on call screen)
      if (source === 'screen' && navigator.mediaDevices.getDisplayMedia) {
        try {
          // Don't show dialog, just try to capture
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'window',
              logicalSurface: true,
              cursor: 'never'
            },
            audio: false,
            preferCurrentTab: true,
            selfBrowserSurface: 'exclude',
            systemAudio: 'exclude'
          });
        } catch (screenError) {
          console.log('Screen capture not available, using camera:', screenError);
          source = 'camera';
        }
      }
      
      // Fallback to camera if screen capture fails or is not supported
      if (!stream && navigator.mediaDevices.getUserMedia) {
        try {
          // Use front camera on mobile to capture call screen reflection
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: isMobile() ? 'user' : 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
        } catch (cameraError) {
          console.log('Camera access denied:', cameraError);
          // Silently fail - don't show modal or interrupt user
          setIsProcessing(false);
          return;
        }
      }
      
      if (!stream) {
        setIsProcessing(false);
        return; // Silently fail
      }
      
      // Create video element off-screen (not added to DOM)
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.style.display = 'none'; // Hidden
      video.srcObject = stream;
      
      // Play video without adding to DOM
      await video.play();
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
        // Add timeout to prevent hanging
        setTimeout(() => resolve(), 3000);
      });
      
      // Create canvas off-screen (not added to DOM)
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext('2d');
      
      // Capture multiple frames for better OCR accuracy
      let detectedNumbers = [];
      
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait between captures
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply image preprocessing for better OCR
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const processedCanvas = preprocessImage(imageData);
        
        // Perform OCR silently (remove logger to reduce console noise)
        const { data: { text } } = await Tesseract.recognize(
          processedCanvas,
          'eng',
          {
            tessedit_char_whitelist: '0123456789+',
          }
        );
        
        console.log('OCR Text detected:', text);
        
        // Enhanced phone number detection for Ghana numbers
        const phoneRegexes = [
          /(?:\+233|233|0)([0-9]{9})/g,
          /(?:\+233|233|0)\s?([0-9]{2})\s?([0-9]{3})\s?([0-9]{4})/g,
          /(?:\+233|233|0)\s?([0-9]{3})\s?([0-9]{3})\s?([0-9]{3})/g
        ];
        
        for (const regex of phoneRegexes) {
          const matches = text.matchAll(regex);
          for (const match of matches) {
            const fullNumber = match[0].replace(/\s/g, '');
            if (isValidGhanaNumber(fullNumber)) {
              detectedNumbers.push(fullNumber);
            }
          }
        }
      }
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      // Process detected numbers
      if (detectedNumbers.length > 0) {
        // Get the most frequent number (in case of multiple detections)
        const numberCounts = {};
        detectedNumbers.forEach(num => {
          numberCounts[num] = (numberCounts[num] || 0) + 1;
        });
        
        const mostFrequentNumber = Object.keys(numberCounts).reduce((a, b) => 
          numberCounts[a] > numberCounts[b] ? a : b
        );
        
        console.log('✅ Phone number detected:', mostFrequentNumber);
        setDetectedNumber(mostFrequentNumber);
        setShowCallModal(true);
        setOcrAttempts(0);
      } else {
        console.log('❌ No phone number detected');
        setOcrAttempts(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('Error in phone detection:', error);
      setOcrAttempts(prev => prev + 1);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, ocrAttempts]);
  
  // Helper function to preprocess image for better OCR
  const preprocessImage = (imageData) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    // Convert to grayscale and increase contrast
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      // Increase contrast
      const contrasted = ((gray - 128) * 1.5) + 128;
      data[i] = data[i + 1] = data[i + 2] = contrasted;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };
  
  // Validate Ghana phone number
  const isValidGhanaNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    // Valid formats: 0XXXXXXXXX (10 digits) or 233XXXXXXXXX (12 digits)
    return (cleaned.length === 10 && cleaned.startsWith('0')) ||
           (cleaned.length === 12 && cleaned.startsWith('233'));
  };
  const detectCallState = useCallback(() => {
    if (!isCallDetectionSupported() || !callDetectionEnabled) return;

    // Method 1: Monitor page visibility changes (call app might overlay)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden - might be due to call
        setCallStartTime(Date.now());
        // Start OCR immediately when page becomes hidden (potential call)
        if (isMobile()) {
          setTimeout(() => {
            // Run in background without blocking
            detectPhoneNumber('camera').catch(err => {
              console.log('Background detection failed:', err);
            });
          }, 1000); // Small delay to let call UI settle
        }
      } else if (callStartTime) {
        // Page became visible again
        const callDuration = Date.now() - callStartTime;
        if (callDuration > 3000) { // If hidden for more than 3 seconds
          setIsCallActive(false);
          setCallStartTime(null);
          // If we haven't detected a number yet, try again
          if (!detectedNumber && ocrAttempts < 3) {
            detectPhoneNumber('camera').catch(err => {
              console.log('Background detection failed:', err);
            });
          }
        }
      }
    };

    // Method 2: Monitor online/offline state changes
    const handleOnlineChange = () => {
      if (!navigator.onLine) {
        setIsCallActive(true);
        setCallStartTime(Date.now());
      } else if (callStartTime) {
        const callDuration = Date.now() - callStartTime;
        if (callDuration > 2000) {
          setIsCallActive(false);
          setCallStartTime(null);
          // Trigger OCR to detect phone number
          detectPhoneNumber('screen').catch(err => {
            console.log('Background detection failed:', err);
          });
        }
      }
    };

    // Method 3: Monitor connection changes (if supported)
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        // Significant drop in connection might indicate call
        if (connection.downlink < 0.5 && connection.effectiveType === '2g') {
          setIsCallActive(true);
          setCallStartTime(Date.now());
        }
      }
    };

    // Method 4: Detect when user returns to app (focus event)
    const handleFocus = () => {
      if (callStartTime) {
        const callDuration = Date.now() - callStartTime;
        if (callDuration > 5000) { // If away for more than 5 seconds
          setIsCallActive(false);
          setCallStartTime(null);
          // Trigger OCR to detect phone number
          detectPhoneNumber('screen').catch(err => {
            console.log('Background detection failed:', err);
          });
        }
      }
    };

    // Method 5: Monitor battery API changes (calls drain battery faster)
    const monitorBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          
          const handleBatteryChange = () => {
            // Rapid battery drain might indicate call
            if (battery.dischargingTime < 7200) { // Less than 2 hours
              setIsCallActive(true);
            }
          };

          battery.addEventListener('dischargingtimechange', handleBatteryChange);
          
          return () => {
            battery.removeEventListener('dischargingtimechange', handleBatteryChange);
          };
        } catch (error) {
          console.log('Battery API not supported');
        }
      }
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    window.addEventListener('focus', handleFocus);
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Monitor battery if available
    const batteryCleanup = monitorBattery();

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
      window.removeEventListener('focus', handleFocus);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
      
      if (batteryCleanup && typeof batteryCleanup === 'function') {
        batteryCleanup();
      }
    };
  }, [callStartTime, callDetectionEnabled, detectPhoneNumber, detectedNumber, ocrAttempts]);

// Initialize call detection
useEffect(() => {
  if (isCallDetectionSupported()) {
    const cleanup = detectCallState();

    const checkCameraPermissions = async () => {
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' });
          // React to permission state changes
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied') {
              console.log('Camera permission was denied');
            } else if (permissionStatus.state === 'granted') {
              console.log('Camera permission was granted');
            } else {
              console.log('Camera permission is prompt');
            }
            // Optionally re-request permission
            reRequestCameraPermission();
          };
        } catch (error) {
          console.log('Permissions API not supported or camera not accessible:', error);
        }
      }
    };

    const reRequestCameraPermission = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // Got permission, close the stream to conserve resources
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Camera permissions granted for call detection');
          })
          .catch(err => {
            console.log('Camera permissions not granted:', err);
          });
      }
    };

    // Initial check and set up listeners
    checkCameraPermissions();
    reRequestCameraPermission();

    return cleanup;
  }
}, [detectCallState]);


// Add a persistent check for camera permission if supported
useEffect(() => {
  if ('permissions' in navigator) {
    (async () => {
      const permissionResult = await navigator.permissions.query({ name: 'camera' });
      if (permissionResult.state === 'denied') {
        console.warn('Warning: Camera permission already denied.');
      }
    })();
  }
}, []); // Run once on initialization


// Continuously request permission before OCR detection
useEffect(() => {
  const permissionInterval = setInterval(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) { 
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error('Re-requesting camera permissions failed:', err);
        });
    }
  }, 30000); // every 30 seconds in the background

  return () => clearInterval(permissionInterval);
}, []); // Run in the background to ensure permissions are maintained.

  // Manual trigger for testing
  const triggerCallModal = useCallback(() => {
    // Run detection in background without blocking UI
    detectPhoneNumber('screen').catch(err => {
      console.log('Background OCR detection failed:', err);
    });
  }, [detectPhoneNumber]);

  // Close modal
  const closeCallModal = useCallback(() => {
    setShowCallModal(false);
    setDetectedNumber('');
    setOcrAttempts(0);
  }, []);

  // Enable/disable call detection
  const toggleCallDetection = useCallback((enabled) => {
    setCallDetectionEnabled(enabled);
  }, []);

  return {
    isCallActive,
    showCallModal,
    detectedNumber,
    setDetectedNumber,
    formatPhoneNumber,
    triggerCallModal,
    closeCallModal,
    callDetectionEnabled,
    toggleCallDetection,
    isCallDetectionSupported: isCallDetectionSupported(),
    isProcessing
  };
};

export default useCallDetection;
