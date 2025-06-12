// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Global elements
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    const audioUnlockContainer = document.getElementById('audioUnlockContainer');
    const audioUnlockBtn = document.getElementById('audioUnlockBtn');

    // Story Book specific elements
    const horizontalContainer = document.querySelector('.horizontal-scroll-container');
    const narrativeSections = document.querySelectorAll('.narrative-section');
    const playButtons = document.querySelectorAll('.play-btn');

    // New Global Audio Player elements
    const globalVolumeControlContainer = document.getElementById('volumeControlContainer');
    const globalVolumeIcon = document.getElementById('volumeIcon');
    const globalVolumeSlider = document.getElementById('globalVolumeSlider');
    const globalMediaPlayer = document.getElementById('globalMediaPlayer');
    const globalPlayPauseBtn = document.getElementById('globalPlayPauseBtn');
    const globalSeekSlider = document.getElementById('globalSeekSlider');
    const currentTimeDisplay = document.getElementById('currentTime');
    const totalTimeDisplay = document.getElementById('totalTime');
    const playbackSpeedSelector = document.getElementById('playbackSpeedSelector');

    let currentAudio = null; // Currently playing audio element
    let currentPlayButton = null; // Reference to the play button of the current audio
    let currentSection = 0;
    let isAutoScrolling = false;
    let audioCompleted = false;
    let canNavigate = true;
    let audioContextUnlocked = false; // Initialize to false
    let hasCompletedStory = false; // Track if user has completed the story
    let isFastForwardMode = false; // Track fast-forward mode state
    let autoAdvanceEnabled = true; // Track if auto-advance is enabled
    let isRestarting = false; // Track if story is being restarted
    let isManualNavigation = false; // Add a flag to track manual navigation

    // Add fast-forward mode indicator to the DOM
    const fastForwardIndicator = document.createElement('div');
    fastForwardIndicator.className = 'fast-forward-mode';
    fastForwardIndicator.innerHTML = '<span class="icon">⏩</span> Fast-Forward Mode';
    document.body.appendChild(fastForwardIndicator);

    // Add auto-advance mode indicator to the DOM
    const autoAdvanceIndicator = document.createElement('div');
    autoAdvanceIndicator.className = 'auto-advance-mode active';
    autoAdvanceIndicator.innerHTML = '<span class="icon">🔄</span> Auto-Advance: ON';
    document.body.appendChild(autoAdvanceIndicator);

    // Function to toggle fast-forward mode
    function toggleFastForwardMode() {
        isFastForwardMode = !isFastForwardMode;
        fastForwardIndicator.classList.toggle('active');
        updateNavigationButtons();
    }

    // Function to toggle auto-advance mode
    function toggleAutoAdvanceMode() {
        autoAdvanceEnabled = !autoAdvanceEnabled;
        autoAdvanceIndicator.classList.toggle('active');
        autoAdvanceIndicator.innerHTML = autoAdvanceEnabled ? 
            '<span class="icon">🔄</span> Auto-Advance: ON' : 
            '<span class="icon">⏸️</span> Auto-Advance: OFF';
        
        // If enabling auto-advance, check if current audio has already ended
        if (autoAdvanceEnabled) {
            console.log('Auto-advance enabled - checking if current audio has already ended');
            const currentNarrativeSection = narrativeSections[currentSection];
            if (currentNarrativeSection) {
                const currentAudioElement = currentNarrativeSection.querySelector('audio');
                if (currentAudioElement && currentAudioElement.ended) {
                    console.log('Current audio has already ended - immediately triggering auto-advance');
                    // Small delay to ensure the toggle completes and UI updates
                    setTimeout(() => {
                        autoAdvanceToNextPanel();
                    }, 100);
                } else if (audioCompleted) {
                    console.log('Audio marked as completed - immediately triggering auto-advance');
                    // Small delay to ensure the toggle completes and UI updates
                    setTimeout(() => {
                        autoAdvanceToNextPanel();
                    }, 100);
                } else {
                    console.log('Audio not yet completed - auto-advance will trigger when current audio ends');
                }
            }
        }
    }

    // Function to update navigation buttons state
    function updateNavigationButtons() {
        const currentNarrativeSection = narrativeSections[currentSection];
        if (!currentNarrativeSection) return;

        const prevBtn = currentNarrativeSection.querySelector('.prev-btn');
        const nextBtn = currentNarrativeSection.querySelector('.next-btn');

        if (prevBtn) {
            // Previous button is always enabled except for first section
            prevBtn.disabled = currentSection === 0;
            prevBtn.style.display = 'block'; // Always show previous button
        }

        if (nextBtn) {
            // Show next button only if auto-advance is OFF and audio is completed
            if (!autoAdvanceEnabled && audioCompleted) {
                nextBtn.style.display = 'block';
                nextBtn.classList.add('visible');
            } else {
                nextBtn.style.display = 'none';
                nextBtn.classList.remove('visible');
            }
        }
    }

    // Initially hide the global media player and volume control
    if (globalMediaPlayer) {
        globalMediaPlayer.style.display = 'none';
    }
    if (globalVolumeControlContainer) {
        globalVolumeControlContainer.style.display = 'none';
    }

    // Attempt to unlock audio context immediately on user interaction
    function unlockAudioContext() {
        // Only attempt if not already unlocked
        if (audioContextUnlocked) return; 
        console.log('Attempting to unlock audio context...');

        const silentAudio = document.createElement('audio');
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==';
        silentAudio.volume = 0;

        const playPromise = silentAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioContextUnlocked = true;
                if (audioUnlockContainer) {
                    audioUnlockContainer.style.display = 'none'; // Hide the unlock button if successful
                }
                console.log('Audio context unlocked successfully.');
            }).catch(e => {
                console.error('Failed to unlock audio context:', e);
                if (audioUnlockContainer) {
                    audioUnlockContainer.style.display = 'flex'; // Show unlock button if it failed
                }
            });
        }
    }

    // Call unlockAudioContext on first user interaction
    document.body.addEventListener('click', unlockAudioContext, { once: true });
    document.body.addEventListener('keydown', unlockAudioContext, { once: true });

    // --- Initial Setup ---
    // Set initial active states for navigation and sections
    updateActiveNav('home');
    showSection('home'); // Ensure home section is visible on load

    // Initialize sounds section (if it exists on the page)
    if (document.getElementById('sounds')) {
        initializeSoundsSection();
    }

    // Setup video overlay functionality globally
    setupVideoOverlay();

    // --- Navigation (Global) ---
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            showSection(targetId);
            updateActiveNav(targetId);

            // If navigating to 'sounds' section, stop any currently playing audio
            if (targetId === 'sounds') {
                console.log('Navigating to Story Book section.');
                stopCurrentAudio();
                // Ensure the sounds section home is active
                currentSection = 0;
                updateActiveNarrativeSection();
                // Show unlock button if on sounds home
                if (audioUnlockContainer) {
                    // Only show if audio context is not yet unlocked
                    if (!audioContextUnlocked) {
                        audioUnlockContainer.style.display = 'flex';
                    } else {
                        audioUnlockContainer.style.display = 'none';
                    }
                }
                // Ensure global media player is visible when entering Story Book
                if (globalMediaPlayer) {
                    globalMediaPlayer.style.display = 'flex';
                }
                if (globalVolumeControlContainer) {
                    globalVolumeControlContainer.style.display = 'flex'; // Show volume control on story book
                }
                // Auto-advance indicator is always visible in story book now
            } else {
                console.log('Navigating away from Story Book section. Stopping audio.');
                stopCurrentAudio(); // Stop any audio playing when leaving sounds section
                if (globalMediaPlayer) {
                    globalMediaPlayer.style.display = 'none'; // Hide global media player outside story book
                }
                if (globalVolumeControlContainer) {
                    globalVolumeControlContainer.style.display = 'none'; // Hide volume control outside story book
                }
                // Hide auto-advance indicator outside story book
                if (autoAdvanceIndicator) {
                    autoAdvanceIndicator.style.display = 'none';
                }
            }
            
            // Pause YouTube video when leaving behind-scenes section
            const currentActiveSection = document.querySelector('.section.active');
            if (currentActiveSection && currentActiveSection.id === 'behind-scenes' && targetId !== 'behind-scenes') {
                pauseYouTubeVideo();
            }
            
            // Add click feedback
            this.style.transform = 'translateY(-2px) scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
        
        // Add hover effects
        item.addEventListener('mouseenter', function() {
            this.style.letterSpacing = '2px';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.letterSpacing = '1px';
        });
    });
    
    // Show specific section
    function showSection(targetId) {
        console.log('Showing section:', targetId);
        
        // Pause YouTube video when leaving behind-scenes section
        const currentActiveSection = document.querySelector('.section.active');
        if (currentActiveSection && currentActiveSection.id === 'behind-scenes' && targetId !== 'behind-scenes') {
            pauseYouTubeVideo();
        }
        
        sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
                // Reset any existing transitions
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                
                // Force a reflow
                void section.offsetWidth;
                
                // Add transition and show section
                section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
                
                // Special handling for sounds section
                if (targetId === 'sounds') {
                    console.log('Initializing Story Book section...');
                    stopCurrentAudio();
                    currentSection = 0;
                    updateActiveNarrativeSection();
                    if (audioUnlockContainer) {
                        audioUnlockContainer.style.display = !audioContextUnlocked ? 'flex' : 'none';
                    }
                    if (globalMediaPlayer) {
                        globalMediaPlayer.style.display = 'flex';
                    }
                    if (globalVolumeControlContainer) {
                        globalVolumeControlContainer.style.display = 'flex';
                    }
                }
            } else {
                section.classList.remove('active');
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                section.style.transition = 'none';
            }
        });
        
        // Update active navigation state
        updateActiveNav(targetId);
        
        // Scroll to top of the page
        window.scrollTo(0, 0);
        updateStoryBookUIVisibility();
    }
    
    // Update active navigation state
    function updateActiveNav(activeTarget) {
        navItems.forEach(item => {
            if (item.getAttribute('data-target') === activeTarget) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // --- Story Book Section Logic (Merged from sound.js) ---
    function initializeSoundsSection() {
        console.log('Initializing Story Book section...');
        currentSection = 0;
        updateActiveNarrativeSection();
        setupAudioControls();
        setupBranchingChoice();
        setupAudioUnlock();
        setupGlobalMediaPlayer(); // Initialize global media player
        setupVideoOverlay(); // Initialize video overlay functionality
    }

    // Setup audio unlock functionality
    function setupAudioUnlock() {
        console.log('Setting up audio unlock...');
        if (audioUnlockBtn) {
            audioUnlockBtn.addEventListener('click', function() {
                console.log('Audio unlock button clicked.');
                unlockAudioContext(); // Use the common unlock function
            });
        }
        // Initial check for unlock button visibility
        if (audioUnlockContainer && !audioContextUnlocked) {
            console.log('Audio unlock container set to display flex (initially visible).');
            audioUnlockContainer.style.display = 'flex';
        } else {
            console.log('Audio unlock container set to display none (initially hidden).');
            audioUnlockContainer.style.display = 'none';
        }
    }

    // Check if we need to show audio unlock button (this function is now less critical as unlock is attempted on first interaction)
    function checkAudioPermissions() {
        // This function is largely redundant now as audio context is attempted on first interaction.
        // Its display logic is handled by setupAudioUnlock and unlockAudioContext.
        console.log('checkAudioPermissions called (redundant now).');
    }

    // Setup branching choice functionality
    function setupBranchingChoice() {
        const choiceButtons = document.querySelectorAll('.choice-btn');
        choiceButtons.forEach(button => {
            button.addEventListener('click', function() {
                const choice = this.getAttribute('data-choice');
                handleChoice(choice);
            });
        });
    }

    // Function to show final page with moral
    window.showFinalPage = function() {
        console.log('Showing final page with moral');
        stopCurrentAudio();
        
        // Hide all narrative sections
        document.querySelectorAll('.narrative-section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        
        // Show final page
        const finalPage = document.querySelector('.final-page');
        if (finalPage) {
            finalPage.style.display = 'flex';
            finalPage.classList.add('active');
        }
        
        // Prevent further navigation
        currentSection = -1;
        canNavigate = false;
        
        // Disable all navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.style.display = 'none';
            btn.disabled = true;
        });
        
        // Enable only the restart button
        const restartBtn = document.querySelector('.restart-btn');
        if (restartBtn) {
            restartBtn.style.display = 'block';
            restartBtn.disabled = false;
        }
        
        // Show notification
        showNotification('The story has ended. You can restart to explore the other path.');
    };

    // Handle user choice
    function handleChoice(choice) {
        console.log('Handling choice:', choice);
        stopCurrentAudio();

        // Hide all narrative sections before showing the target
        document.querySelectorAll('.narrative-section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        if (choice === 'sleep') {
            showNotification('He chooses rest over communion...');
            // Hide pray branch panels
            document.querySelectorAll('.narrative-section').forEach(section => {
                if (parseInt(section.dataset.section) > 5) {
                    section.style.display = 'none';
                    section.classList.remove('active');
                }
            });
            // Set a flag to prevent auto-advance after sleep ending
            window.isSleepEnding = true;
            // Set current section to 5 and use standard navigation logic for autoplay
            currentSection = 5;
            scrollToSection(5);
            
            // Get the sleep ending section and its audio
            const sleepSection = document.querySelector('.ending-sleep');
            if (sleepSection) {
                sleepSection.style.display = 'flex';
                sleepSection.classList.add('active');
                
                const sleepAudio = sleepSection.querySelector('audio');
                const playButton = sleepSection.querySelector('.play-btn');
                
                if (sleepAudio && playButton) {
                    currentAudio = sleepAudio;
                    currentPlayButton = playButton;
                    updateGlobalMediaPlayer(sleepAudio);
                    
                    // Force autoplay for sleep ending
                    if (audioContextUnlocked) {
                        audioCompleted = false;
                        canNavigate = false;
                        sleepAudio.play().then(() => {
                            updatePlayButtonState(playButton, sleepAudio, true);
                            if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '⏸';
                            
                            // Add onended listener for sleep ending
                            sleepAudio.onended = () => {
                                console.log('Sleep ending audio completed - showing final page');
                                updatePlayButtonState(playButton, sleepAudio, false);
                                if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
                                showFinalPage();
                            };
                        }).catch(error => {
                            console.error('Error playing sleep ending audio:', error);
                            updatePlayButtonState(playButton, sleepAudio, false);
                            if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
                        });
                    }
                }
            }
            
            // Now disable auto-advance for sleep branch
            autoAdvanceEnabled = false;
            return;
        }

        let targetSection;
        if (choice === 'pray') {
            targetSection = document.querySelector('.narrative-section[data-section="6"]');
            showNotification('He chooses faith over flesh...');
            // Hide sleep branch panel
            document.querySelectorAll('.narrative-section').forEach(section => {
                if (section.classList.contains('ending-sleep')) {
                    section.style.display = 'none';
                    section.classList.remove('active');
                }
            });
            // Reset sleep ending flag
            window.isSleepEnding = false;
            // Enable auto-advance for pray branch
            autoAdvanceEnabled = true;
        }

        if (targetSection) {
            // Special handling for panel 6 as first panel after branching
            const sectionNum = targetSection.dataset.section;
            if (sectionNum === '6') {
                targetSection.style.display = 'flex';
                targetSection.style.alignItems = 'center';
                targetSection.style.justifyContent = 'center';
            } else {
                targetSection.style.display = 'flex';
            }
            targetSection.classList.add('active');

            // --- Ensure play button and audio are set up for this panel ---
            const audio = targetSection.querySelector('audio');
            const playButton = targetSection.querySelector('.play-btn');
            if (audio && playButton) {
                currentAudio = audio;
                currentPlayButton = playButton;
                updateGlobalMediaPlayer(audio);
                updatePlayButtonState(playButton, audio, false); // Ensure play button is visible and reset
                // Force autoplay for pray choice
                if (audioContextUnlocked) {
                    audioCompleted = false;
                    canNavigate = false;
                    audio.play().then(() => {
                        updatePlayButtonState(playButton, audio, true);
                        if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '⏸';
                    }).catch(error => {
                        console.error('Error playing audio:', error);
                        updatePlayButtonState(playButton, audio, false);
                        if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
                    });
                }
            }
            // --- End setup ---

            // Add onended listener for auto-advance
            if (audio) {
                audio.onended = () => {
                    updatePlayButtonState(playButton, audio, false);
                    if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
                    canNavigate = true;
                    audioCompleted = true;
                    // For pray branch, only show final page after panel 9
                    if (targetSection.dataset.section === '9') {
                        console.log('Pray branch completed - showing final page');
                        showFinalPage();
                        return;
                    }
                    // For pray branch, continue to next panel
                    if (autoAdvanceEnabled) {
                        const nextSectionIndex = parseInt(targetSection.dataset.section) + 1;
                        if (nextSectionIndex <= 9) { // Only advance up to panel 9
                            currentSection = nextSectionIndex;
                            scrollToSection(currentSection);
                            updateActiveNarrativeSection(false, true);
                        }
                    }
                };
            }
        }
    }

    // Restart story function
    window.restartStory = function() {
        console.log('Restarting story...');
        
        // Set restart flag to prevent observer interference
        isRestarting = true;
        
        // Comprehensive cleanup
        stopAllAudio(); // Stop ALL audio elements, not just current one
        
        // Reset all story state variables
        currentSection = 0;
        audioCompleted = false;
        canNavigate = true;
        hasCompletedStory = false;
        
        // Reset auto-scroll flag to prevent conflicts
        isAutoScrolling = false;
        
        // Hide ending sections
        const endingSleep = document.querySelector('.ending-sleep');
        const endingPray = document.querySelector('.ending-pray');
        if (endingSleep) endingSleep.style.display = 'none';
        if (endingPray) endingPray.style.display = 'none';

        // Hide branching choice
        const branchingChoice = document.querySelector('.branching-choice');
        if (branchingChoice) {
            branchingChoice.style.display = 'none';
        }

        // Ensure home section is visible
        const homeSection = document.querySelector('[data-section="0"]');
        if (homeSection) {
            homeSection.style.display = 'flex';
        }
        
        // Remove active class from all sections first
        narrativeSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Scroll to home section first
        scrollToSection(0, true);
        
        // Delay the section activation to prevent multiple audio triggers
        setTimeout(() => {
            // Only update the active class without triggering audio autoplay
            narrativeSections[0].classList.add('active');
            updateNavigationButtons();
            
            // Clear restart flag after everything is settled
            setTimeout(() => {
                isRestarting = false;
            }, 200);
        }, 600); // Wait for scroll animation to complete
        
        showNotification('Story reset. Choose your path again...');

        // In restartStory, also remove 'blurred' from panel 4
        const panel4 = document.querySelector('.narrative-section[data-section="4"]');
        if (panel4) panel4.classList.remove('blurred');
    }

    // Setup horizontal scroll functionality
    function setupHorizontalScroll() {
        console.log('Setting up horizontal scroll...');
        if (!horizontalContainer) return;

        horizontalContainer.addEventListener('wheel', function(e) {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                this.scrollLeft += e.deltaY;
            }
        });

        let startX = 0;
        let scrollStartX = 0;

        horizontalContainer.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            scrollStartX = this.scrollLeft;
        });

        horizontalContainer.addEventListener('touchmove', function(e) {
            if (!startX) return;

            const currentX = e.touches[0].clientX;
            const diffX = startX - currentX;
            this.scrollLeft = scrollStartX + diffX;
        });

        horizontalContainer.addEventListener('touchend', function() {
            startX = 0;
            scrollStartX = 0;
        });

        horizontalContainer.addEventListener('scroll', function() {
            if (isAutoScrolling) return;

            const scrollLeft = this.scrollLeft;
            const sectionWidth = window.innerWidth;
            const newSection = Math.round(scrollLeft / sectionWidth);

            // Block forward navigation if auto-advance is enabled
            if (autoAdvanceEnabled && newSection > currentSection) {
                scrollToSection(currentSection, false);
                showNotification('Auto-advance is enabled. Navigation will happen automatically when audio finishes.');
                return;
            }

            if (newSection > currentSection && !canNavigate && newSection > 0) {
                scrollToSection(currentSection, false);
                showNotification('Please wait for the audio to finish before proceeding...');
                return;
            }

            if (newSection !== currentSection && newSection >= 0 && newSection < narrativeSections.length) {
                console.log('Scroll detected. New section:', newSection, 'Old section:', currentSection);
                currentSection = newSection;
                updateActiveNarrativeSection(); // This will handle the active class and potentially play audio
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const direction = e.key === 'ArrowRight' ? 1 : -1;
                
                // Block forward navigation if auto-advance is enabled
                if (autoAdvanceEnabled && direction > 0) {
                    showNotification('Auto-advance is enabled. Navigation will happen automatically when audio finishes.');
                    return;
                }
                
                navigateSection(direction);
            } else if (e.key === ' ') {
                e.preventDefault();
                toggleCurrentAudio();
            }
        });
    }

    // Navigate between sections
    function navigateSection(direction) {
        console.log('navigateSection called with direction:', direction, 'currentSection:', currentSection);
        
        // Stop current audio before navigating
        stopCurrentAudio();
        
        const newSection = currentSection + direction;
        if (newSection >= 0 && newSection < narrativeSections.length) {
            currentSection = newSection;
            scrollToSection(currentSection);
            updateActiveNarrativeSection(false, false); // Don't autoplay when manually navigating
            updateNavigationButtons();
        }
    }

    // Scroll to specific section
    function scrollToSection(sectionIndex, smooth = true) {
        console.log('scrollToSection called with index:', sectionIndex);
        console.log('Total sections:', narrativeSections.length);
        
        // Hide all narrative sections
        narrativeSections.forEach((section, idx) => {
            console.log(`Section ${idx} before:`, section.style.display);
            if (idx === sectionIndex) {
                section.style.display = 'flex';
                section.classList.add('active');
                console.log(`Section ${idx} after:`, section.style.display, 'active class added');
                
                // Update global media player with new audio
                const audio = section.querySelector('audio');
                if (audio) {
                    currentAudio = audio;
                    updateGlobalMediaPlayer(audio);
                }
            } else {
                section.style.display = 'none';
                section.classList.remove('active');
                console.log(`Section ${idx} after:`, section.style.display, 'active class removed');
            }
        });
        
        // No scrolling needed since panels are stacked, but keep the rest for compatibility
        // Optionally, scroll to top
        window.scrollTo(0, 0);
        updateStoryBookUIVisibility();
    }

    // Update active narrative section and related states
    function updateActiveNarrativeSection(skipAutoplay = false, forceAutoplay = false, isSeamlessTransition = false) {
        console.log('Updating active narrative section. Current section:', currentSection, 'skipAutoplay:', skipAutoplay, 'forceAutoplay:', forceAutoplay, 'isSeamlessTransition:', isSeamlessTransition);
        
        // Only stop current audio if not doing a seamless transition
        if (!skipAutoplay && !isSeamlessTransition) {
            stopCurrentAudio(); // Stop previous audio before activating new panel
        }
        
        narrativeSections.forEach((section, index) => {
            if (index === currentSection) {
                section.classList.add('active');
                section.style.display = 'flex';
                
                // Hide branching choice initially for panel 4
                if (section.dataset.section === '4') {
                    section.classList.remove('blurred');
                    const branchingChoice = section.querySelector('.branching-choice');
                    if (branchingChoice) {
                        branchingChoice.style.display = 'none';
                    }
                }
                
                // Only autoplay if not skipping autoplay (used during restart)
                if (!skipAutoplay) {
                    // Autoplay audio for current panel if it has audio and context is unlocked
                    const audio = section.querySelector('audio');
                    const playButton = section.querySelector('.play-btn');
                    
                    if (audio && playButton) {
                        console.log('Audio element and play button found for panel', section.dataset.section);
                        // Update current audio references regardless of autoplay
                        currentAudio = audio;
                        currentPlayButton = playButton;
                        updateGlobalMediaPlayer(audio);
                        
                        // Always attempt to autoplay if forceAutoplay is true or auto-advance is enabled
                        if ((forceAutoplay || autoAdvanceEnabled) && audio.paused && audioContextUnlocked) {
                            console.log('Attempting autoplay for panel', section.dataset.section);
                            // Reset navigation flags before playing
                            canNavigate = false;
                            audioCompleted = false;
                            
                            // For seamless transitions, preload and play immediately
                            if (isSeamlessTransition) {
                                audio.preload = 'auto';
                                audio.load(); // Force load to ensure readiness
                            }
                            
                            audio.play().then(() => {
                                updatePlayButtonState(playButton, audio, true);
                                if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '⏸';
                                
                                // Add onended listener for auto-advance
                                audio.onended = () => {
                                    console.log('Audio ended for panel', section.dataset.section);
                                    updatePlayButtonState(playButton, audio, false);
                                    canNavigate = true;
                                    audioCompleted = true;
                                    
                                    // Special handling for panel 4
                                    if (section.dataset.section === '4') {
                                        console.log('Panel 4 audio ended - showing branching choice overlay');
                                        section.classList.add('blurred');
                                        const branchingChoice = section.querySelector('.branching-choice');
                                        if (branchingChoice) {
                                            branchingChoice.style.display = 'flex';
                                        }
                                        return; // Don't auto-advance, wait for user choice
                                    }
                                    
                                    // Auto-advance to next panel for other panels
                                    if (autoAdvanceEnabled) {
                                        console.log('Auto-advance enabled, advancing to next panel');
                                        const nextSectionIndex = currentSection + 1;
                                        if (nextSectionIndex < narrativeSections.length) {
                                            // Use requestAnimationFrame for smoother transition timing
                                            requestAnimationFrame(() => {
                                                // Seamless transition: prepare next audio immediately
                                            const nextSection = narrativeSections[nextSectionIndex];
                                            const nextAudio = nextSection.querySelector('audio');
                                                
                                                // Preload next audio for instant playback
                                                if (nextAudio) {
                                                    nextAudio.preload = 'auto';
                                                    nextAudio.load();
                                                }
                                                
                                                // Update current section
                                                currentSection = nextSectionIndex;
                                            
                                                // Show next section with seamless transition
                                            scrollToSection(currentSection);
                                                updateActiveNarrativeSection(false, true, true); // isSeamlessTransition = true
                                            });
                                        }
                                    }
                                };
                            }).catch(error => {
                                console.error('Error playing audio:', error);
                                updatePlayButtonState(playButton, audio, false);
                                if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
                            });
                        }
                    }
                }
            } else {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        });
        updateStoryBookUIVisibility();
        updateCarouselArrows();
    }

    // Attempt autoplay for chapter audio (if any)
    function autoPlayChapterAudio() {
        // This function is now fully redundant. Autoplay is handled by updateActiveNarrativeSection.
        console.log('autoPlayChapterAudio called (redundant).');
    }

    // Function to attempt autoplay (re-added for clarity in case of other uses)
    function attemptAutoplay(playButton, audioElement, isUserInitiated = false) {
        // This function is now fully redundant. Autoplay is handled by updateActiveNarrativeSection.
        console.log('attemptAutoplay called (redundant).');
        if (!audioElement || !playButton || !audioContextUnlocked) return;

        if (audioElement.paused) {
            playAudio(audioElement, playButton, playButton.querySelector('.play-icon'), playButton.querySelector('.play-text'));
        }
    }

    // Update play button state (icon and text)
    function updatePlayButtonState(button, audio, isPlaying) {
        if (!button || !audio) return;
        
        const playIcon = button.querySelector('.play-icon');
        const playText = button.querySelector('.play-text');
        
        if (isPlaying) {
            button.classList.add('playing');
            if (playIcon) playIcon.textContent = '⏸';
            if (playText) playText.textContent = 'PAUSE';
        } else {
            button.classList.remove('playing');
            if (playIcon) playIcon.textContent = '▶';
            if (playText) playText.textContent = 'PLAY';
        }
        
        // Update global play/pause button state
        if (globalPlayPauseBtn) {
            globalPlayPauseBtn.textContent = isPlaying ? '⏸' : '▶';
        }
    }

    // Setup audio controls for each narrative section
    function setupAudioControls() {
        console.log('Setting up audio controls for play buttons.');
        playButtons.forEach(button => {
            button.addEventListener('click', function() {
                console.log('Play button clicked for panel:', this.closest('.narrative-section').dataset.section);
                const narrativeSection = this.closest('.narrative-section');
                const audio = narrativeSection.querySelector('audio');

                if (audio) {
                    if (!audioContextUnlocked) {
                        showNotification('Please enable audio first (bottom left icon)!');
                        console.log('Audio context not unlocked. Cannot play audio.');
                        return;
                    }

                    if (currentAudio && currentAudio !== audio) {
                        console.log('Another audio is playing. Stopping:', currentAudio.src);
                        // If another audio is playing, stop it and reset its button
                        currentAudio.pause();
                        if (currentPlayButton) {
                            resetAudioButton(currentPlayButton);
                        }
                    }

                    if (audio.paused) {
                        console.log('Audio is paused. Playing audio:', audio.src);
                        playAudio(audio, this, this.querySelector('.play-icon'), this.querySelector('.play-text'));
                    } else {
                        console.log('Audio is playing. Pausing audio:', audio.src);
                        pauseAudio(audio, this, this.querySelector('.play-icon'), this.querySelector('.play-text'));
                    }
                }
            });
        });
    }

    // Preload next audio for seamless transitions
    function preloadNextAudio() {
        if (autoAdvanceEnabled && currentSection + 1 < narrativeSections.length) {
            const nextSection = narrativeSections[currentSection + 1];
            const nextAudio = nextSection.querySelector('audio');
            if (nextAudio) {
                nextAudio.preload = 'auto';
                nextAudio.load();
                console.log('Preloaded next audio:', nextAudio.src);
            }
        }
    }

    // Play audio logic
    function playAudio(audioElement, button, playIcon, playText) {
        console.log('playAudio called for:', audioElement.src);
        
        // Store current audio and button references
        currentAudio = audioElement;
        currentPlayButton = button;
        
        // Update global media player
        updateGlobalMediaPlayer(audioElement);
        
        // Preload next audio for seamless auto-advance
        preloadNextAudio();
        
        // Remove any existing onended listeners
        audioElement.onended = null;
        
        // Add new onended listener
        audioElement.onended = () => {
            console.log('Audio ended for:', audioElement.src);
            updatePlayButtonState(button, audioElement, false);
            canNavigate = true;
            audioCompleted = true;
            
            // Check if this is an ending audio
            const currentNarrativeSection = button.closest('.narrative-section');
            if (currentNarrativeSection && 
                (currentNarrativeSection.classList.contains('ending-sleep') || 
                 currentNarrativeSection.classList.contains('ending-pray'))) {
                console.log('Ending audio completed - showing final page');
                // Small delay to ensure smooth transition
                setTimeout(() => {
                    showFinalPage();
                }, 500);
                return; // Don't proceed with auto-advance
            }
            
            // Update navigation buttons to show next button if auto-advance is disabled
            updateNavigationButtons();
            
            // Auto-advance to next panel only if auto-advance is enabled and not in an ending
            if (autoAdvanceEnabled && !window.isSleepEnding) {
                console.log('Auto-advance enabled, advancing to next panel');
                const nextSectionIndex = currentSection + 1;
                if (nextSectionIndex < narrativeSections.length) {
                                            // Use requestAnimationFrame for smoother transition timing
                                            requestAnimationFrame(() => {
                                                // Seamless transition: prepare next audio immediately
                    const nextSection = narrativeSections[nextSectionIndex];
                    const nextAudio = nextSection.querySelector('audio');
                                                
                                                // Preload next audio for instant playback
                                                if (nextAudio) {
                                                    nextAudio.preload = 'auto';
                                                    nextAudio.load();
                                                }
                                                
                                                // Update current section
                                                currentSection = nextSectionIndex;
                    
                                                // Show next section with seamless transition
                    scrollToSection(currentSection);
                                                updateActiveNarrativeSection(false, true, true); // isSeamlessTransition = true
                                            });
                }
            }
        };
        
        // Add timeupdate listener for media player sync
        audioElement.ontimeupdate = () => {
            if (globalSeekSlider) {
                const progress = (audioElement.currentTime / audioElement.duration) * 100;
                globalSeekSlider.value = progress;
            }
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
            }
        };
        
        // Play the audio
        audioElement.play().then(() => {
            updatePlayButtonState(button, audioElement, true);
            if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '⏸';
            
            // Reset navigation flags when audio starts playing
            canNavigate = false;
            audioCompleted = false;
            
            // Update navigation buttons to hide next button while audio is playing
            updateNavigationButtons();
        }).catch(error => {
            console.error('Error playing audio:', error);
            // Update button state even if play fails
            updatePlayButtonState(button, audioElement, false);
            if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
        });
    }

    // Pause audio logic
    function pauseAudio(audioElement, button, playIcon, playText) {
        console.log('pauseAudio called for:', audioElement.src);
        audioElement.pause();
        updatePlayButtonState(button, audioElement, false);
        if (globalPlayPauseBtn) globalPlayPauseBtn.textContent = '▶';
        
        // Only update navigation flags if the audio hasn't completed
        if (!audioCompleted) {
            canNavigate = true;
        }
    }

    // Reset audio button to initial state
    function resetAudioButton(button) {
        console.log('resetAudioButton called for button:', button);
        button.classList.remove('playing');
        button.querySelector('.play-icon').textContent = '▶';
        button.querySelector('.play-text').textContent = 'PLAY';
    }

    // Stop any audio currently playing across all sections
    function stopCurrentAudio() {
        console.log('stopCurrentAudio called. currentAudio:', currentAudio ? currentAudio.src : 'none', 'currentPlayButton:', currentPlayButton);
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio.currentTime = 0; // Rewind the audio
            if (currentPlayButton) {
                resetAudioButton(currentPlayButton); // Use currentPlayButton here
            }
        }
        currentAudio = null; // Clear current audio reference
        currentPlayButton = null; // Clear currentPlayButton reference
    }

    // Stop ALL audio elements (for restart functionality)
    function stopAllAudio() {
        console.log('stopAllAudio called - stopping all audio elements');
        // Stop all audio elements in the document
        document.querySelectorAll('audio').forEach(audio => {
            if (!audio.paused) {
                console.log('Stopping audio:', audio.src);
                audio.pause();
                audio.currentTime = 0;
            }
        });
        
        // Reset all play buttons
        document.querySelectorAll('.play-btn').forEach(button => {
            resetAudioButton(button);
        });
        
        // Clear current references
        currentAudio = null;
        currentPlayButton = null;
        
        // Reset global media player
        if (globalMediaPlayer) {
            globalPlayPauseBtn.textContent = '▶';
            globalSeekSlider.value = 0;
            currentTimeDisplay.textContent = '0:00';
            totalTimeDisplay.textContent = '0:00';
        }
    }

    // Toggle play/pause for current section audio (for spacebar)
    function toggleCurrentAudio() {
        console.log('toggleCurrentAudio called.');
        const currentNarrativeSection = narrativeSections[currentSection];
        if (currentNarrativeSection) {
            const audio = currentNarrativeSection.querySelector('audio');
            const button = currentNarrativeSection.querySelector('.play-btn');

            if (audio && button) {
                if (!audioContextUnlocked) {
                    showNotification('Please enable audio first (bottom left icon)!');
                    console.log('Audio context not unlocked. Cannot toggle audio.');
                    return;
                }
                // Ensure currentAudio and currentPlayButton are set for spacebar toggle
                currentAudio = audio;
                currentPlayButton = button;

                if (audio.paused) {
                    console.log('Toggling to play via spacebar.');
                    playAudio(audio, button, button.querySelector('.play-icon'), button.querySelector('.play-text'));
                } else {
                    console.log('Toggling to pause via spacebar.');
                    pauseAudio(audio, button, button.querySelector('.play-icon'), button.querySelector('.play-text'));
                }
            }
        }
    }

    // Show a temporary notification message
    let notificationTimeout;
    function showNotification(message, duration = 3000) {
        let notification = document.getElementById('notification');
        if (!notification) {
            const newNotification = document.createElement('div');
            newNotification.id = 'notification';
            newNotification.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.9); color: #000; padding: 10px 20px; border-radius: 5px; z-index: 10000; opacity: 0; transition: opacity 0.3s ease-in-out;';
            document.body.appendChild(newNotification);
            notification = newNotification;
        }

        notification.textContent = message;
        notification.style.opacity = '1';

        clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }

    // Function to handle panel navigation
    function handlePanelNavigation(newSectionIndex) {
        console.log('handlePanelNavigation called with newSectionIndex:', newSectionIndex);
        
        // Get the target section
        const targetSection = narrativeSections[newSectionIndex];
        if (!targetSection) {
            console.log('Invalid section index:', newSectionIndex);
            return;
        }

        // Hide all sections
        narrativeSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        // Show target section
        targetSection.style.display = 'flex';
        targetSection.classList.add('active');

        // Update current section
        currentSection = newSectionIndex;

        // Get audio elements
        const newAudioElement = targetSection.querySelector('audio');
        const newPlayButton = targetSection.querySelector('.play-btn');

        if (newAudioElement && newPlayButton) {
            // Update references
            currentAudio = newAudioElement;
            currentPlayButton = newPlayButton;
            updateGlobalMediaPlayer(newAudioElement);

            // Play audio if context is unlocked
            if (audioContextUnlocked) {
                // Reset audio state
                audioCompleted = false;
                canNavigate = false;
                
                // Play the audio
                playAudio(newAudioElement, newPlayButton, newPlayButton.querySelector('.play-icon'), newPlayButton.querySelector('.play-text'));
            }
        }

        // Update navigation buttons
        updateNavigationButtons();
    }

    // Auto-advance to next panel when audio ends
    function autoAdvanceToNextPanel() {
        if (!autoAdvanceEnabled) {
            console.log('Auto-advance is disabled - not advancing to next panel');
            return;
        }
        
        console.log('Auto-advancing to next panel from section:', currentSection);
        
        const currentNarrativeSection = narrativeSections[currentSection];
        
        // Handle special cases first
        if (currentNarrativeSection.dataset.section === '4') {
            // Panel 4 leads to branching choice, don't auto-advance
            console.log('Panel 4 audio ended - showing branching choice instead of auto-advancing');
            const branchingChoice = currentNarrativeSection.querySelector('.branching-choice');
            if (branchingChoice) {
                branchingChoice.style.display = 'flex';
            }
            return;
        }
        
        // Check if we're at the end of the story
        if (currentNarrativeSection.classList.contains('ending-sleep')) {
            console.log('Reached sleep ending - showing final page');
            showFinalPage();
            return;
        }
        
        if (currentNarrativeSection.classList.contains('ending-pray')) {
            console.log('Reached pray ending - not auto-advancing');
            return;
        }
        
        // Find next valid section
        let nextSectionIndex = currentSection + 1;
        let nextSection = narrativeSections[nextSectionIndex];
        
        // Skip hidden sections
        while (nextSection && nextSection.style.display === 'none') {
            nextSectionIndex++;
            if (nextSectionIndex >= narrativeSections.length) {
                nextSection = null;
                break;
            }
            nextSection = narrativeSections[nextSectionIndex];
        }
        
        if (nextSection && nextSectionIndex < narrativeSections.length) {
            console.log('Auto-advancing to section:', nextSectionIndex);
            
            // Reset flags for the new section
            audioCompleted = false;
            canNavigate = false; // Prevent manual navigation during auto-advance
            
            // Navigate to next panel
            currentSection = nextSectionIndex;
            scrollToSection(currentSection);
            updateActiveNarrativeSection(false, true); // forceAutoplay = true for auto-advance
            updateNavigationButtons();
            
            // The audio will be handled by updateActiveNarrativeSection with forceAutoplay = true
            console.log('Auto-advance completed - audio should be playing automatically');
        } else {
            console.log('No valid next section found for auto-advance');
        }
    }

    // Function to navigate between panels (from sounds.html buttons)
    window.navigatePanel = function(direction) {
        console.log('navigatePanel called with direction:', direction, 'from section:', currentSection);
        
        // Stop any current audio
        stopCurrentAudio();
        
        // Special case: if we're on panel 6 and going back, go to panel 4
        if (currentSection === 6 && direction === -1) {
            currentSection = 4;
            scrollToSection(currentSection);
            updateActiveNarrativeSection(false, true);
            updateNavigationButtons();
            return;
        }
        
        // Calculate new section index
        let newSectionIndex = currentSection + direction;
        
        // Ensure we stay within bounds
        if (newSectionIndex >= 0 && newSectionIndex < narrativeSections.length) {
            // Update current section
            currentSection = newSectionIndex;
            
            // Navigate to the new section
            scrollToSection(currentSection);
            
            // Update the active section and play audio
            updateActiveNarrativeSection(false, true);
            
            // Update navigation buttons
            updateNavigationButtons();
        }
    };

    // --- New Global Volume Control Logic ---
    if (globalVolumeControlContainer && globalVolumeIcon && globalVolumeSlider) {
        console.log('Setting up global volume controls.');
        globalVolumeIcon.addEventListener('click', () => {
            console.log('Global volume icon clicked.');
            globalVolumeSlider.classList.toggle('active');
        });

        globalVolumeSlider.addEventListener('input', (event) => {
            const volume = parseFloat(event.target.value);
            console.log('Global volume slider changed to:', volume);
            // Apply volume to current audio if playing
            if (currentAudio) {
                currentAudio.volume = volume;
                console.log('Applied volume to current audio:', currentAudio.src);
            }
            // Also apply to all other audio elements, just in case
            document.querySelectorAll('audio').forEach(audio => {
                audio.volume = volume;
            });
        });
    }

    // --- New Global Media Player Logic ---
    function setupGlobalMediaPlayer() {
        console.log('Setting up global media player.');
        if (!globalMediaPlayer) return;

        globalPlayPauseBtn.addEventListener('click', () => {
            console.log('Global play/pause button clicked.');
            if (currentAudio) {
                if (currentAudio.paused) {
                    console.log('Global player: current audio paused, attempting to play.');
                    currentAudio.play().then(() => {
                        updatePlayButtonState(currentPlayButton, currentAudio, true);
                    }).catch(error => {
                        console.error('Error playing audio:', error);
                        showNotification('Error playing audio. Please try again.');
                    });
                } else {
                    console.log('Global player: current audio playing, attempting to pause.');
                    currentAudio.pause();
                    updatePlayButtonState(currentPlayButton, currentAudio, false);
                }
            } else {
                console.log('Global player: No current audio to play/pause.');
            }
        });

        globalSeekSlider.addEventListener('input', () => {
            if (currentAudio) {
                const seekTime = (globalSeekSlider.value / 100) * currentAudio.duration;
                currentAudio.currentTime = seekTime;
            }
        });

        // Handle playback speed changes
        if (playbackSpeedSelector) {
            playbackSpeedSelector.addEventListener('change', () => {
                if (currentAudio) {
                    currentAudio.playbackRate = parseFloat(playbackSpeedSelector.value);
                }
            });
        }

        // Update global media player state as audio plays
        document.querySelectorAll('audio').forEach(audioElement => {
            audioElement.addEventListener('timeupdate', () => {
                if (audioElement === currentAudio) {
                    const progress = (audioElement.currentTime / audioElement.duration) * 100;
                    globalSeekSlider.value = progress;
                    currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
                    // console.log('Time update for:', audioElement.src, 'Time:', audioElement.currentTime);
                }
            });

            audioElement.addEventListener('loadedmetadata', () => {
                if (audioElement === currentAudio) {
                    totalTimeDisplay.textContent = formatTime(audioElement.duration);
                    globalSeekSlider.max = 100;
                    globalSeekSlider.value = 0;
                    console.log('Loaded metadata for:', audioElement.src, 'Duration:', audioElement.duration);
                }
            });

            audioElement.addEventListener('play', () => {
                if (audioElement === currentAudio) {
                    globalPlayPauseBtn.textContent = '⏸';
                    console.log('Global player button set to PAUSE (audio playing).');
                    // Keep global media player visible in story book, if it was already visible or current section is sounds
                    if (globalMediaPlayer && sections[currentSection].id === 'sounds') {
                        globalMediaPlayer.style.display = 'flex';
                    }
                }
            });

            audioElement.addEventListener('pause', () => {
                if (audioElement === currentAudio) {
                    globalPlayPauseBtn.textContent = '▶';
                    console.log('Global player button set to PLAY (audio paused).');
                }
            });

                        audioElement.addEventListener('ended', () => {
                if (audioElement === currentAudio) {
                    globalPlayPauseBtn.textContent = '▶';
                    globalSeekSlider.value = 0;
                    currentTimeDisplay.textContent = '0:00';
                    console.log('Global player: Audio ended.');
                    // Note: Auto-advance logic is handled in playAudio function's onended handler
                }
            });
        });
    }

    // Update the updateGlobalMediaPlayer function
    function updateGlobalMediaPlayer(audio) {
        if (!audio) return;
        
        // Update total time display
        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = formatTime(audio.duration);
        }
        
        // Reset seek slider
        if (globalSeekSlider) {
            globalSeekSlider.value = 0;
        }
        
        // Update current time display
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = '0:00';
        }
        
        // Update playback speed
        if (playbackSpeedSelector) {
            audio.playbackRate = parseFloat(playbackSpeedSelector.value);
        }
        
        // Ensure global player is visible
        if (globalMediaPlayer) {
            globalMediaPlayer.style.display = 'flex';
        }
        
        // Update play/pause button state
        if (globalPlayPauseBtn) {
            globalPlayPauseBtn.textContent = audio.paused ? '▶' : '⏸';
        }
        
        // Force a timeupdate event to sync the media player
        const event = new Event('timeupdate');
        audio.dispatchEvent(event);
    }

    // Helper to format time
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Intersection Observer for active section detection
    const observeElements = () => {
        console.log('Setting up Intersection Observer for narrative sections.');
        const observerOptions = {
            root: horizontalContainer,
            rootMargin: '0px',
            threshold: 0.7
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isRestarting && !isManualNavigation) {
                    const activeSection = entry.target;
                    const sectionIndex = Array.from(narrativeSections).indexOf(activeSection);
                    console.log('Intersection Observer: Section', sectionIndex, 'is intersecting.');
                    if (sectionIndex !== -1 && sectionIndex !== currentSection) {
                        console.log('Intersection Observer: Current section changed to', sectionIndex);
                        currentSection = sectionIndex;
                        const newAudioElement = activeSection.querySelector('audio');
                        const newPlayButton = activeSection.querySelector('.play-btn');

                        if (newAudioElement && newPlayButton) {
                            console.log('Intersection Observer: Found audio and play button for new active section.');
                            currentAudio = newAudioElement;
                            currentPlayButton = newPlayButton;
                            updateGlobalMediaPlayer(newAudioElement);
                            
                            if (!autoAdvanceEnabled && audioContextUnlocked && newAudioElement.paused) {
                                console.log('Intersection Observer: Attempting autoplay for new active section (auto-advance disabled).');
                                setTimeout(() => {
                                    playAudio(newAudioElement, newPlayButton, newPlayButton.querySelector('.play-icon'), newPlayButton.querySelector('.play-text'));
                                }, 300);
                            } else if (autoAdvanceEnabled) {
                                console.log('Intersection Observer: Auto-advance is enabled, skipping autoplay - will be handled by auto-advance.');
                            }
                        } else {
                            console.log('Intersection Observer: No audio or play button for new active section.');
                            currentAudio = null;
                            currentPlayButton = null;
                            if (globalMediaPlayer) {
                                globalPlayPauseBtn.textContent = '▶';
                                globalSeekSlider.value = 0;
                                currentTimeDisplay.textContent = '0:00';
                                totalTimeDisplay.textContent = '0:00';
                            }
                        }
                        updateActiveNarrativeSection();
                    }
                }
            });
        }, observerOptions);

        narrativeSections.forEach(section => {
            observer.observe(section);
        });
    };

    // Call observeElements after initial setup for Story Book
    if (document.getElementById('sounds')) {
        observeElements();
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleFastForwardMode();
            showNotification(isFastForwardMode ? 'Fast-forward mode enabled!' : 'Fast-forward mode disabled.');
        }
        if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            toggleAutoAdvanceMode();
            showNotification(autoAdvanceEnabled ? 'Auto-advance enabled!' : 'Auto-advance disabled.');
        }
    });

    // Add click functionality to auto-advance indicator
    autoAdvanceIndicator.addEventListener('click', function() {
        toggleAutoAdvanceMode();
        showNotification(autoAdvanceEnabled ? 'Auto-advance enabled!' : 'Auto-advance disabled.');
    });

    // Initialize navigation buttons state
    updateNavigationButtons();

    // Add click event for 'Enter the Story' button to navigate to Story Book
    const ctaBtn = document.querySelector('.cta-btn');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', function() {
            showSection('sounds');
            updateActiveNav('sounds');
            window.scrollTo(0, 0);
        });
    }

    function showFirstPanel() {
        // Hide the home section
        const homeSection = document.querySelector('.narrative-section.home-section');
        if (homeSection) {
            homeSection.classList.remove('active');
            homeSection.style.display = 'none';
        }
        // Show the first panel
        const firstPanel = document.querySelector('.narrative-section[data-section="1"]');
        if (firstPanel) {
            currentSection = 1; // Ensure auto-advance logic works
            firstPanel.classList.add('active');
            firstPanel.style.display = 'flex';
            // Play the audio for the first panel
            const audio = firstPanel.querySelector('audio');
            const playButton = firstPanel.querySelector('.play-btn');
            if (audio && playButton) {
                if (typeof audioContextUnlocked !== 'undefined' && !audioContextUnlocked) {
                    audio.play().then(() => {
                        audioContextUnlocked = true;
                        playAudio(audio, playButton, playButton.querySelector('.play-icon'), playButton.querySelector('.play-text'));
                    }).catch(() => {
                        playAudio(audio, playButton, playButton.querySelector('.play-icon'), playButton.querySelector('.play-text'));
                    });
                } else {
                    playAudio(audio, playButton, playButton.querySelector('.play-icon'), playButton.querySelector('.play-text'));
                }
            }
        }
    }

    // Attach to the trigger button
    const triggerBtn = document.querySelector('.trigger-btn');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', showFirstPanel);
    }

    // Auto-advance toggle functionality is now handled by the existing autoAdvanceIndicator
    function setupAutoAdvanceToggle() {
        // This function is no longer needed - auto-advance toggle is handled by autoAdvanceIndicator
        console.log('Auto-advance toggle handled by existing autoAdvanceIndicator in top right');
    }

    // Setup video overlay functionality
    function setupVideoOverlay() {
        const videoOverlay = document.getElementById('videoOverlay');
        const videoPlayBtn = document.getElementById('videoPlayBtn');
        const youtubeVideo = document.getElementById('youtubeVideo');
        
        if (videoOverlay && videoPlayBtn && youtubeVideo) {
            // Add click event to overlay and play button
            const handleVideoClick = () => {
                console.log('Video overlay clicked - showing YouTube video');
                
                // Hide overlay with animation
                videoOverlay.classList.add('hidden');
                
                // Show YouTube video after overlay fades out
                setTimeout(() => {
                    videoOverlay.style.display = 'none';
                    youtubeVideo.style.display = 'block';
                    
                    // Update iframe src to enable autoplay
                    const currentSrc = youtubeVideo.src;
                    if (!currentSrc.includes('autoplay=1')) {
                        const separator = currentSrc.includes('?') ? '&' : '?';
                        youtubeVideo.src = currentSrc + separator + 'autoplay=1&rel=0';
                    }
                    
                    // Ensure video is properly sized
                    youtubeVideo.style.width = '100%';
                    youtubeVideo.style.height = '100%';
                    
                    console.log('YouTube video is now visible and should be playing');
                }, 300);
            };
            
            videoOverlay.addEventListener('click', handleVideoClick);
            videoPlayBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double-triggering
                handleVideoClick();
            });
            
            console.log('Video overlay functionality setup complete');
        } else {
            console.log('Video overlay elements not found');
        }
    }

    // Setup auto-advance toggle
        setupAutoAdvanceToggle();

    // Setup video overlay
    setupVideoOverlay();
    
    // Setup mobile burger menu
    setupBurgerMenu();

    // Add event listeners for video cleanup
    setupVideoCleanup();

    // Add after updateNavigationButtons or in updateActiveNarrativeSection
    function updateCarouselArrows() {
        const currentSectionEl = narrativeSections[currentSection];
        if (!currentSectionEl) return;
        // Always position prev on left and next on right
        const prevArrow = currentSectionEl.querySelector('.carousel-arrow-btn.prev');
        const nextArrow = currentSectionEl.querySelector('.carousel-arrow-btn.next');
        if (prevArrow) {
            prevArrow.style.left = '';
            prevArrow.style.right = '';
            prevArrow.style.display = '';
        }
        if (nextArrow) {
            nextArrow.style.right = '';
            nextArrow.style.left = '';
            if (autoAdvanceEnabled) {
                nextArrow.style.display = 'none';
            } else {
                nextArrow.style.display = '';
            }
        }
    }

    // Call updateCarouselArrows after section changes and after toggling auto-advance
    const origUpdateActiveNarrativeSection = updateActiveNarrativeSection;
    updateActiveNarrativeSection = function(...args) {
        origUpdateActiveNarrativeSection.apply(this, args);
        updateCarouselArrows();
    };

    const origToggleAutoAdvanceMode = toggleAutoAdvanceMode;
    toggleAutoAdvanceMode = function(...args) {
        origToggleAutoAdvanceMode.apply(this, args);
        updateCarouselArrows();
    };
});

// Mobile Burger Menu Functionality
function setupBurgerMenu() {
    const navBurger = document.getElementById('navBurger');
    const navItems = document.getElementById('navItems');
    
    if (!navBurger || !navItems) {
        console.log('Burger menu elements not found');
        return;
    }
    
    // Toggle mobile menu
    navBurger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        navBurger.classList.toggle('active');
        navItems.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (navItems.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close menu when clicking on a nav item
    const navItemElements = navItems.querySelectorAll('.nav-item');
    navItemElements.forEach(item => {
        item.addEventListener('click', () => {
            navBurger.classList.remove('active');
            navItems.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navItems.classList.contains('active') && 
            !navItems.contains(e.target) && 
            !navBurger.contains(e.target)) {
            navBurger.classList.remove('active');
            navItems.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Close menu on window resize if desktop view
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navBurger.classList.remove('active');
            navItems.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navItems.classList.contains('active')) {
            navBurger.classList.remove('active');
            navItems.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    console.log('Burger menu setup complete');
}

// Function to pause/stop YouTube video
function pauseYouTubeVideo() {
    const youtubeVideo = document.getElementById('youtubeVideo');
    const videoOverlay = document.getElementById('videoOverlay');
    
    if (youtubeVideo && videoOverlay) {
        console.log('Pausing YouTube video');
        
        // Hide the video and show overlay again
        youtubeVideo.style.display = 'none';
        videoOverlay.classList.remove('hidden');
        
        // Reset the video src to stop playback completely
        const originalSrc = youtubeVideo.src.split('?')[0]; // Remove query parameters
        youtubeVideo.src = originalSrc;
        
        console.log('YouTube video paused and reset');
    }
}

// Setup video cleanup event listeners
function setupVideoCleanup() {
    // Pause video when page is about to unload
    window.addEventListener('beforeunload', () => {
        pauseYouTubeVideo();
    });
    
    // Pause video when page visibility changes (user switches tabs)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            const currentActiveSection = document.querySelector('.section.active');
            if (currentActiveSection && currentActiveSection.id === 'behind-scenes') {
                pauseYouTubeVideo();
            }
        }
    });
    
    console.log('Video cleanup event listeners added');
}

// Helper function to update visibility of auto-advance indicator and media player
function updateStoryBookUIVisibility() {
    // Hide on home panel (currentSection === 0), show otherwise
    if (typeof currentSection !== 'undefined') {
        if (currentSection === 0) {
            if (autoAdvanceIndicator) autoAdvanceIndicator.style.display = 'none';
            if (globalMediaPlayer) globalMediaPlayer.style.display = 'none';
        } else {
            if (autoAdvanceIndicator) autoAdvanceIndicator.style.display = 'flex';
            if (globalMediaPlayer) globalMediaPlayer.style.display = 'flex';
        }
    }
}