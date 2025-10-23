async function loadPoll() {
    const response = await fetch('poll.json');
    return await response.json();
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-ar');
    const scene = document.getElementById('ar-scene');
    const fallbackMessage = document.getElementById('fallback-message');
  
    startButton.addEventListener('click', async () => {
      const pollData = await loadPoll();
      startButton.style.display = 'none';
  
      // Check for WebXR AR support
      if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        try {
          // Start AR session
          const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'dom-overlay'],
            domOverlay: { root: document.body }
          });
          scene.setAttribute('xrweb', '');
          scene.renderer.xr.setSession(session);
          displayPollInAR(scene, pollData, session);
        } catch (error) {
          console.error('AR session failed:', error);
          fallbackMessage.style.display = 'block';
          displayPollIn3D(scene, pollData); // Fallback to 3D
        }
      } else {
        // AR not supported, use 3D mode
        fallbackMessage.style.display = 'block';
        displayPollIn3D(scene, pollData);
      }
    });
  
    function displayPollInAR(scene, pollData, session) {
      // Add question as 2D overlay
      const questionElem = document.createElement('div');
      questionElem.innerText = pollData.question;
      questionElem.style.position = 'absolute';
      questionElem.style.top = '50px';
      questionElem.style.width = '100%';
      questionElem.style.textAlign = 'center';
      questionElem.style.color = 'white';
      document.body.appendChild(questionElem);
  
      // Set up hit-test for AR
      session.requestReferenceSpace('viewer').then(viewerSpace => {
        session.requestHitTestSource({ space: viewerSpace }).then(hitTestSource => {
          session.requestReferenceSpace('local').then(localSpace => {
            const onFrame = (time, frame) => {
              session.requestAnimationFrame(onFrame);
              const hitResults = frame.getHitTestResults(hitTestSource);
              if (hitResults.length > 0) {
                const hitPose = hitResults[0].getPose(localSpace);
                if (!scene.getAttribute('data-options-placed')) {
                  placeOptions(scene, pollData, hitPose.transform.position);
                  scene.setAttribute('data-options-placed', 'true');
                }
              }
            };
            session.requestAnimationFrame(onFrame);
          });
        });
      });
    }
  
    function displayPollIn3D(scene, pollData) {
      // Add question as 2D overlay
      const questionElem = document.createElement('div');
      questionElem.innerText = pollData.question;
      questionElem.style.position = 'absolute';
      questionElem.style.top = '50px';
      questionElem.style.width = '100%';
      questionElem.style.textAlign = 'center';
      questionElem.style.color = 'white';
      document.body.appendChild(questionElem);
  
      // Place options in 3D space (in front of camera)
      placeOptions(scene, pollData, { x: 0, y: 1.6, z: -3 }); // Fixed position
    }
  
    function placeOptions(scene, pollData, basePosition) {
      pollData.options.forEach((option, index) => {
        let entity;
        if (option.type === 'image' || option.type === 'gif') {
          entity = document.createElement('a-plane');
          entity.setAttribute('material', `src: ${option.media}; transparent: true`);
          entity.setAttribute('width', 1);
          entity.setAttribute('height', 1);
        } else if (option.type === 'video') {
          entity = document.createElement('a-video');
          entity.setAttribute('src', option.media);
          entity.setAttribute('width', 1);
          entity.setAttribute('height', 1);
          entity.setAttribute('autoplay', true);
          entity.setAttribute('loop', true);
        }
  
        // Position in a row
        entity.setAttribute('position', `${basePosition.x + index * 1.5 - 1.5} ${basePosition.y} ${basePosition.z}`);
        entity.setAttribute('rotation', '0 0 0'); // Face camera
  
        // Add text label
        const text = document.createElement('a-text');
        text.setAttribute('value', option.text);
        text.setAttribute('position', '0 -0.6 0');
        text.setAttribute('align', 'center');
        entity.appendChild(text);
  
        // Make interactive
        entity.setAttribute('class', 'clickable');
        entity.addEventListener('click', () => handleVote(option.text));
  
        scene.appendChild(entity);
      });
    }
  
    function handleVote(selected) {
      alert(`You voted for: ${selected}`);
      // Optionally send to backend: fetch('/vote', {method: 'POST', body: JSON.stringify({vote: selected})});
    }
  
    // Add cursor for 3D mode interactions
    const cursor = document.createElement('a-cursor');
    scene.appendChild(cursor);
  });