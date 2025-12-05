// MTG Pack Opener - Main Application
// Uses Scryfall API for card data

class MTGPackOpener {
    constructor() {
        this.setsData = [];
        this.currentSet = null;
        this.currentCards = [];
        this.tearProgress = 0;
        this.isDragging = false;
        this.startX = 0;
        this.packType = 'play';
        this.packState = 'initial'; // initial, tearing, torn
        
        // Pack configurations based on MTG booster rules
        this.packConfigs = {
            play: {
                name: 'Play Booster',
                cardCount: 14,
                description: '14 cards including 1 rare/mythic, 3 uncommons, 6 commons, and special slots'
            },
            draft: {
                name: 'Draft Booster',
                cardCount: 15,
                description: '15 cards including 1 rare/mythic, 3 uncommons, 10 commons, and 1 land'
            },
            collector: {
                name: 'Collector Booster',
                cardCount: 15,
                description: '15 cards with guaranteed foils, extended art, and special treatments'
            }
        };
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.loadSets();
    }

    cacheElements() {
        // Sections
        this.setSelection = document.getElementById('setSelection');
        this.packArea = document.getElementById('packArea');
        this.cardsArea = document.getElementById('cardsArea');
        
        // Set selection
        this.setsGrid = document.getElementById('setsGrid');
        this.setSearch = document.getElementById('setSearch');
        
        // Pack area
        this.pack = document.getElementById('pack');
        this.packContainer = document.getElementById('packContainer');
        this.packWrapper = document.getElementById('packWrapper');
        this.packFront = document.getElementById('packFront');
        this.packRetailBg = document.getElementById('packRetailBg');
        this.packSetLogo = document.getElementById('packSetLogo');
        this.packSetName = document.getElementById('packSetName');
        this.packTypeLabel = document.getElementById('packTypeLabel');
        this.packCardCount = document.getElementById('packCardCount');
        this.currentSetName = document.getElementById('currentSetName');
        this.currentSetInfo = document.getElementById('currentSetInfo');
        this.instructions = document.getElementById('instructions');
        this.instructionText = document.getElementById('instructionText');
        
        // Tear zone elements
        this.tearZone = document.getElementById('tearZone');
        this.tearStrip = document.getElementById('tearStrip');
        this.tearStripPulled = document.getElementById('tearStripPulled');
        this.tearProgressBar = document.getElementById('tearProgressBar');
        
        // Pack type buttons
        this.packTypeBtns = document.querySelectorAll('.pack-type-btn');
        
        // Cards area
        this.cardsGrid = document.getElementById('cardsGrid');
        this.rarityBreakdown = document.getElementById('rarityBreakdown');
        
        // Buttons
        this.backButton = document.getElementById('backButton');
        this.backToPackButton = document.getElementById('backToPackButton');
        this.openAnotherBtn = document.getElementById('openAnotherBtn');
        
        // Modal
        this.cardModal = document.getElementById('cardModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalClose = document.getElementById('modalClose');
        this.modalCardImage = document.getElementById('modalCardImage');
        this.modalCardInfo = document.getElementById('modalCardInfo');
    }

    bindEvents() {
        // Search
        this.setSearch.addEventListener('input', (e) => this.filterSets(e.target.value));
        
        // Pack type selection
        this.packTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectPackType(btn.dataset.type));
        });
        
        // Tear zone drag events
        this.tearZone.addEventListener('mousedown', (e) => this.startTear(e));
        this.tearZone.addEventListener('touchstart', (e) => this.startTear(e));
        
        document.addEventListener('mousemove', (e) => this.continueTear(e));
        document.addEventListener('touchmove', (e) => this.continueTear(e));
        
        document.addEventListener('mouseup', () => this.endTear());
        document.addEventListener('touchend', () => this.endTear());
        
        // Navigation buttons
        this.backButton.addEventListener('click', () => this.showSetSelection());
        this.backToPackButton.addEventListener('click', () => this.showPackArea());
        this.openAnotherBtn.addEventListener('click', () => this.showPackArea());
        
        // Modal - close when clicking overlay, close button, or empty space in modal
        this.modalOverlay.addEventListener('click', () => this.closeModal());
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.cardModal.addEventListener('click', (e) => {
            // Close if clicking anywhere except the card image itself
            if (e.target !== this.modalCardImage) {
                this.closeModal();
            }
        });
    }

    selectPackType(type) {
        this.packType = type;
        this.packTypeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        this.updatePackDisplay();
    }

    async loadSets() {
        try {
            const response = await fetch('https://api.scryfall.com/sets');
            const data = await response.json();
            
            // Filter to only include sets with cards and that are playable
            this.setsData = data.data.filter(set => 
                set.card_count > 0 && 
                ['core', 'expansion', 'draft_innovation', 'masters', 'funny'].includes(set.set_type) &&
                !set.digital
            ).sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
            
            this.renderSets(this.setsData);
        } catch (error) {
            console.error('Failed to load sets:', error);
            this.setsGrid.innerHTML = '<p class="error">Failed to load sets. Please refresh the page.</p>';
        }
    }

    renderSets(sets) {
        this.setsGrid.innerHTML = sets.map(set => `
            <div class="set-card" data-set-code="${set.code}">
                <div class="set-icon">
                    <img src="${set.icon_svg_uri}" alt="${set.name} icon" onerror="this.style.display='none'">
                </div>
                <div class="set-details">
                    <h3>${set.name}</h3>
                    <p>${new Date(set.released_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${set.card_count} cards</p>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        this.setsGrid.querySelectorAll('.set-card').forEach(card => {
            card.addEventListener('click', () => this.selectSet(card.dataset.setCode));
        });
    }

    filterSets(query) {
        const filtered = this.setsData.filter(set => 
            set.name.toLowerCase().includes(query.toLowerCase()) ||
            set.code.toLowerCase().includes(query.toLowerCase())
        );
        this.renderSets(filtered);
    }

    async selectSet(setCode) {
        this.currentSet = this.setsData.find(set => set.code === setCode);
        
        if (!this.currentSet) return;
        
        // Update UI
        this.currentSetName.textContent = this.currentSet.name;
        this.currentSetInfo.textContent = `Released: ${new Date(this.currentSet.released_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        
        // Fetch a card from the set to use as pack artwork
        await this.fetchPackArtwork();
        
        this.updatePackDisplay();
        this.showPackArea();
        this.resetPack();
    }

    async fetchPackArtwork() {
        try {
            // Try to get a mythic or rare card with good art for the pack
            const query = `set:${this.currentSet.code} (rarity:mythic OR rarity:rare) is:booster`;
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=random`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    // Find a card with art
                    const cardWithArt = data.data.find(card => card.image_uris?.art_crop);
                    if (cardWithArt) {
                        this.packArtUrl = cardWithArt.image_uris.art_crop;
                        return;
                    }
                }
            }
        } catch (error) {
            console.log('Could not fetch pack artwork');
        }
        this.packArtUrl = null;
    }

    updatePackDisplay() {
        if (!this.currentSet) return;
        
        const config = this.packConfigs[this.packType];
        
        // Update pack visuals
        this.packSetLogo.innerHTML = `<img src="${this.currentSet.icon_svg_uri}" alt="${this.currentSet.name}">`;
        this.packSetName.textContent = this.currentSet.name;
        this.packTypeLabel.textContent = config.name.toUpperCase();
        this.packCardCount.textContent = `${config.cardCount} CARDS`;
        
        // Remove previous pack type classes
        this.packFront.classList.remove('pack-play', 'pack-draft', 'pack-collector');
        this.packFront.classList.add(`pack-${this.packType}`);
        
        // Set pack colors based on pack type and set
        const colors = this.getPackColors(this.currentSet, this.packType);
        this.packFront.style.background = colors.gradient;
        
        // Set pack artwork background if available
        if (this.packArtUrl) {
            this.packRetailBg.style.backgroundImage = `url(${this.packArtUrl})`;
            this.packRetailBg.style.opacity = this.packType === 'collector' ? '0.5' : '0.4';
        } else {
            this.packRetailBg.style.backgroundImage = 'none';
        }
    }

    getPackColors(set, packType) {
        // Generate base hue from set name
        const hash = set.name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const baseHue = hash % 360;
        
        switch (packType) {
            case 'draft':
                // Draft boosters - cooler blue/purple tones with silver accents
                return {
                    gradient: `linear-gradient(180deg, 
                        hsl(220, 50%, 45%) 0%, 
                        hsl(240, 55%, 35%) 30%,
                        hsl(260, 60%, 25%) 60%,
                        hsl(270, 65%, 18%) 100%)`
                };
            case 'collector':
                // Collector boosters - premium gold/black with shimmer
                return {
                    gradient: `linear-gradient(180deg, 
                        hsl(45, 80%, 45%) 0%, 
                        hsl(35, 70%, 30%) 25%,
                        hsl(25, 60%, 20%) 50%,
                        hsl(0, 0%, 10%) 100%)`
                };
            default:
                // Play boosters - set-based colors
                return {
                    gradient: `linear-gradient(180deg, 
                        hsl(${baseHue}, 55%, 40%) 0%, 
                        hsl(${(baseHue + 25) % 360}, 65%, 28%) 50%, 
                        hsl(${(baseHue + 50) % 360}, 75%, 18%) 100%)`
                };
        }
    }

    showSetSelection() {
        this.setSelection.style.display = 'block';
        this.packArea.style.display = 'none';
        this.cardsArea.style.display = 'none';
    }

    showPackArea() {
        this.setSelection.style.display = 'none';
        this.packArea.style.display = 'flex';
        this.cardsArea.style.display = 'none';
        this.resetPack();
    }

    showCardsArea() {
        this.setSelection.style.display = 'none';
        this.packArea.style.display = 'none';
        this.cardsArea.style.display = 'block';
    }

    resetPack() {
        this.packState = 'initial';
        this.tearProgress = 0;
        
        // Reset pack classes
        this.pack.classList.remove('tearing', 'torn');
        this.packWrapper.style.transform = '';
        
        // Show tear zone immediately
        this.tearZone.style.display = 'block';
        this.tearStripPulled.style.width = '0%';
        this.tearProgressBar.style.width = '0%';
        
        // Reset pack container
        this.packContainer.style.display = 'block';
        
        // Update instructions
        this.instructionText.textContent = 'Drag the tear strip from left to right to open the pack!';
    }

    startTear(e) {
        if (this.packState !== 'initial') return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        this.pack.classList.add('tearing');
        this.lastTearX = this.startX;
    }

    continueTear(e) {
        if (!this.isDragging || this.packState !== 'initial') return;
        
        const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const deltaX = currentX - this.startX;
        
        // Only allow rightward drag
        if (deltaX > 0) {
            const tearZoneWidth = this.tearZone.offsetWidth;
            this.tearProgress = Math.min(deltaX / (tearZoneWidth * 0.8), 1);
            
            // Calculate tear velocity for effects
            const tearVelocity = Math.abs(currentX - (this.lastTearX || currentX));
            this.lastTearX = currentX;
            
            // Update visual
            this.tearStripPulled.style.width = `${this.tearProgress * 100}%`;
            this.tearProgressBar.style.width = `${this.tearProgress * 100}%`;
            
            // Add dynamic shake based on tear progress and velocity
            if (this.tearProgress > 0.1 && this.tearProgress < 1) {
                const baseShake = Math.sin(this.tearProgress * 25) * 2;
                const velocityShake = Math.min(tearVelocity * 0.3, 3);
                const totalShake = baseShake + velocityShake;
                this.tearStrip.style.transform = `translateY(${totalShake}px)`;
                
                // Add subtle rotation to pack as it's being torn
                const tearRotation = this.tearProgress * 2;
                this.packWrapper.style.transform = `rotate(${tearRotation}deg)`;
            }
            
            // Spawn micro-particles during tear
            if (this.tearProgress > 0.2 && tearVelocity > 3) {
                this.spawnTearParticle(currentX);
            }
            
            // Check if fully torn
            if (this.tearProgress >= 1) {
                this.completeTear();
            }
        }
    }
    
    spawnTearParticle(x) {
        // Only spawn occasionally for performance
        if (Math.random() > 0.3) return;
        
        const packRect = this.pack.getBoundingClientRect();
        const particle = document.createElement('div');
        particle.className = 'micro-tear-particle';
        
        particle.style.left = `${x}px`;
        particle.style.top = `${packRect.top + 20 + Math.random() * 15}px`;
        
        const tx = (Math.random() - 0.5) * 40;
        const ty = 20 + Math.random() * 30;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }

    endTear() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.pack.classList.remove('tearing');
        this.tearStrip.style.transform = '';
        
        // If not fully torn, reset
        if (this.tearProgress < 1 && this.packState === 'initial') {
            // Animate back
            this.tearProgress = 0;
            this.tearStripPulled.style.width = '0%';
            this.tearProgressBar.style.width = '0%';
        }
    }

    async completeTear() {
        if (this.packState === 'torn') return;
        
        this.isDragging = false;
        this.packState = 'torn';
        this.pack.classList.remove('tearing');
        this.pack.classList.add('torn');
        
        // Create particle effect
        this.createParticles();
        
        // Wait for tear animation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Load cards
        await this.loadCards();
        
        // Show cards area
        this.showCardsArea();
        
        // Start card reveal animation
        setTimeout(() => this.revealCards(), 300);
    }

    createParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);
        
        const packRect = this.pack.getBoundingClientRect();
        
        // Create paper fragments along the tear line
        this.createPaperFragments(container, packRect);
        
        // Create foil sparkles
        this.createFoilSparkles(container, packRect);
        
        setTimeout(() => container.remove(), 2000);
    }
    
    createPaperFragments(container, packRect) {
        // Paper fragment colors
        const paperColors = ['#d4d4d4', '#e8e8e8', '#c0c0c0', '#f0f0f0', '#b8b8b8'];
        
        // Create fragments along the tear line
        for (let i = 0; i < 40; i++) {
            const fragment = document.createElement('div');
            fragment.className = 'paper-fragment';
            
            // Random position along the tear
            const startX = packRect.left + (packRect.width * (i / 40));
            const startY = packRect.top + 25 + (Math.random() - 0.5) * 20;
            
            // Jagged trajectory
            const angle = (Math.random() - 0.5) * Math.PI * 0.8;
            const velocity = 50 + Math.random() * 150;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity + 50; // Slight downward bias
            const rotation = Math.random() * 720 - 360;
            
            fragment.style.left = `${startX}px`;
            fragment.style.top = `${startY}px`;
            fragment.style.background = paperColors[Math.floor(Math.random() * paperColors.length)];
            
            // Random irregular shapes
            const width = 4 + Math.random() * 12;
            const height = 3 + Math.random() * 8;
            fragment.style.width = `${width}px`;
            fragment.style.height = `${height}px`;
            fragment.style.borderRadius = `${Math.random() * 3}px`;
            fragment.style.setProperty('--tx', `${tx}px`);
            fragment.style.setProperty('--ty', `${ty}px`);
            fragment.style.setProperty('--rotation', `${rotation}deg`);
            fragment.style.animationDelay = `${Math.random() * 0.2}s`;
            
            container.appendChild(fragment);
        }
    }
    
    createFoilSparkles(container, packRect) {
        const sparkleColors = ['#ffd700', '#ff9500', '#ffffff', '#ffcc00', '#ff6600', '#ffe066'];
        
        for (let i = 0; i < 30; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'foil-sparkle';
            
            // Sparkles originate from right side (where pack opens)
            const startX = packRect.right - 20 + Math.random() * 40;
            const startY = packRect.top + 25 + (Math.random() - 0.5) * 30;
            
            const angle = (Math.random() - 0.3) * Math.PI; // Bias upward-right
            const velocity = 100 + Math.random() * 200;
            const tx = Math.cos(angle) * velocity + 80;
            const ty = Math.sin(angle) * velocity;
            
            sparkle.style.left = `${startX}px`;
            sparkle.style.top = `${startY}px`;
            sparkle.style.background = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
            sparkle.style.boxShadow = `0 0 ${4 + Math.random() * 8}px ${sparkle.style.background}`;
            
            const size = 3 + Math.random() * 6;
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            sparkle.style.setProperty('--tx', `${tx}px`);
            sparkle.style.setProperty('--ty', `${ty}px`);
            sparkle.style.animationDelay = `${Math.random() * 0.15}s`;
            
            container.appendChild(sparkle);
        }
    }

    async loadCards() {
        try {
            // Fetch cards from the set using Scryfall's search API
            const query = `set:${this.currentSet.code} is:booster`;
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=random`);
            
            if (!response.ok) {
                // Fallback to all cards in set
                const fallbackResponse = await fetch(`https://api.scryfall.com/cards/search?q=set:${this.currentSet.code}&order=random`);
                const fallbackData = await fallbackResponse.json();
                this.currentCards = this.simulateBooster(fallbackData.data || []);
                return;
            }
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                this.currentCards = this.simulateBooster(data.data);
            }
        } catch (error) {
            console.error('Failed to load cards:', error);
            this.cardsTrack.innerHTML = '<p class="error">Failed to load cards. Please try again.</p>';
        }
    }

    simulateBooster(cards) {
        // Separate cards by rarity
        const commons = cards.filter(c => c.rarity === 'common');
        const uncommons = cards.filter(c => c.rarity === 'uncommon');
        const rares = cards.filter(c => c.rarity === 'rare');
        const mythics = cards.filter(c => c.rarity === 'mythic');
        const lands = cards.filter(c => c.type_line && c.type_line.includes('Basic Land'));
        
        const booster = [];
        
        // Helper function to get random cards without duplicates
        const getRandomCards = (pool, count) => {
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(count, shuffled.length));
        };
        
        // Build booster based on pack type
        switch (this.packType) {
            case 'play':
                // Play Booster (14 cards)
                booster.push(...getRandomCards(commons, 6));
                booster.push(...getRandomCards(uncommons, 3));
                
                // Rare/Mythic slot (1/7 chance for mythic)
                if (Math.random() < (1/7) && mythics.length > 0) {
                    booster.push(getRandomCards(mythics, 1)[0]);
                } else if (rares.length > 0) {
                    booster.push(getRandomCards(rares, 1)[0]);
                }
                
                // Land slot
                if (lands.length > 0) {
                    booster.push(getRandomCards(lands, 1)[0]);
                } else if (commons.length > 0) {
                    booster.push(getRandomCards(commons, 1)[0]);
                }
                
                // Wildcard slots
                const wildcardPool = [...commons, ...uncommons];
                booster.push(...getRandomCards(wildcardPool, 3));
                break;
                
            case 'draft':
                // Draft Booster (15 cards)
                booster.push(...getRandomCards(commons, 10));
                booster.push(...getRandomCards(uncommons, 3));
                
                // Rare/Mythic slot (1/8 chance)
                if (Math.random() < 0.125 && mythics.length > 0) {
                    booster.push(getRandomCards(mythics, 1)[0]);
                } else if (rares.length > 0) {
                    booster.push(getRandomCards(rares, 1)[0]);
                }
                
                // Land
                if (lands.length > 0) {
                    booster.push(getRandomCards(lands, 1)[0]);
                }
                break;
                
            case 'collector':
                // Collector Booster (15 cards) - premium experience
                const collectorMythics = getRandomCards(mythics, 2);
                const collectorRares = getRandomCards(rares, 4);
                booster.push(...collectorMythics, ...collectorRares);
                booster.push(...getRandomCards(uncommons, 5));
                booster.push(...getRandomCards(commons, 4));
                break;
        }
        
        // Filter out undefined and limit to expected count
        const config = this.packConfigs[this.packType];
        return booster.filter(c => c !== undefined).slice(0, config.cardCount);
    }

    renderCards() {
        this.cardsGrid.innerHTML = '';
        
        const rarityCounts = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
        
        this.currentCards.forEach((card, index) => {
            const imageUri = card.image_uris?.normal || 
                             card.card_faces?.[0]?.image_uris?.normal || '';
            
            rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
            
            const cardSlot = document.createElement('div');
            cardSlot.className = `card-slot ${card.rarity}`;
            cardSlot.dataset.index = index;
            
            cardSlot.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-front">
                        <img src="${imageUri}" alt="${card.name}" loading="lazy">
                    </div>
                    <div class="card-face card-back">
                        <div class="card-back-design">
                            <span class="mtg-back-logo">MTG</span>
                        </div>
                    </div>
                </div>
                <div class="rarity-indicator">${card.rarity}</div>
            `;
            
            cardSlot.addEventListener('click', () => {
                if (cardSlot.classList.contains('revealed')) {
                    this.openModal(card);
                }
            });
            
            // Add tilt effect on mouse move
            this.addCardTiltEffect(cardSlot);
            
            this.cardsGrid.appendChild(cardSlot);
        });
        
        this.updateRarityBreakdown(rarityCounts);
    }
    
    addCardTiltEffect(cardSlot) {
        const cardInner = cardSlot.querySelector('.card-inner');
        const cardFront = cardSlot.querySelector('.card-front');
        const isFoil = cardSlot.classList.contains('rare') || cardSlot.classList.contains('mythic');
        
        cardSlot.addEventListener('mousemove', (e) => {
            if (!cardSlot.classList.contains('revealed')) return;
            
            const rect = cardSlot.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation based on cursor position
            const rotateX = ((y - centerY) / centerY) * -15; // Max 15 degrees
            const rotateY = ((x - centerX) / centerX) * 15;  // Max 15 degrees
            
            // Apply transform
            cardInner.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                scale(1.05)
            `;
            
            // Calculate foil hue shift based on tilt angle
            if (isFoil && cardFront) {
                // Calculate hue based on combined tilt - full 360 degree hue rotation
                const hue = ((rotateX + rotateY) * 6 + 180) % 360;
                cardFront.style.setProperty('--foil-hue', hue);
            }
        });
        
        cardSlot.addEventListener('mouseleave', () => {
            cardInner.style.transform = 'rotateY(0deg)';
            cardInner.style.transition = 'transform 0.5s ease';
            
            // Reset hue to default
            if (isFoil && cardFront) {
                cardFront.style.setProperty('--foil-hue', '0');
            }
            
            // Reset after transition
            setTimeout(() => {
                cardInner.style.transition = 'transform 0.1s ease-out';
            }, 500);
        });
        
        cardSlot.addEventListener('mouseenter', () => {
            cardInner.style.transition = 'transform 0.1s ease-out';
        });
    }

    updateRarityBreakdown(counts) {
        const items = [];
        
        if (counts.mythic > 0) {
            items.push(`<div class="rarity-item"><div class="rarity-dot mythic"></div><span>${counts.mythic} Mythic</span></div>`);
        }
        if (counts.rare > 0) {
            items.push(`<div class="rarity-item"><div class="rarity-dot rare"></div><span>${counts.rare} Rare</span></div>`);
        }
        if (counts.uncommon > 0) {
            items.push(`<div class="rarity-item"><div class="rarity-dot uncommon"></div><span>${counts.uncommon} Uncommon</span></div>`);
        }
        if (counts.common > 0) {
            items.push(`<div class="rarity-item"><div class="rarity-dot common"></div><span>${counts.common} Common</span></div>`);
        }
        
        this.rarityBreakdown.innerHTML = items.join('');
    }

    revealCards() {
        this.renderCards();
        
        const cardSlots = this.cardsGrid.querySelectorAll('.card-slot');
        
        cardSlots.forEach((slot, index) => {
            setTimeout(() => {
                slot.classList.add('revealed');
            }, index * 150);
        });
    }

    openModal(card) {
        const imageUri = card.image_uris?.large || 
                         card.card_faces?.[0]?.image_uris?.large || 
                         card.image_uris?.normal || '';
        
        this.modalCardImage.src = imageUri;
        this.modalCardInfo.innerHTML = `
            <h3>${card.name}</h3>
            <p>${card.type_line || ''}</p>
            <p style="color: ${this.getRarityColor(card.rarity)}; font-weight: bold;">${card.rarity?.toUpperCase() || ''}</p>
            ${card.oracle_text ? `<p style="margin-top: 15px; font-size: 0.95rem; line-height: 1.5;">${card.oracle_text}</p>` : ''}
            ${card.flavor_text ? `<p style="margin-top: 10px; font-style: italic; color: #888;">"${card.flavor_text}"</p>` : ''}
        `;
        
        this.cardModal.classList.add('active');
    }

    closeModal() {
        this.cardModal.classList.remove('active');
    }

    getRarityColor(rarity) {
        switch (rarity) {
            case 'common': return '#c0c0c0';
            case 'uncommon': return '#a8a8a8';
            case 'rare': return '#ffd700';
            case 'mythic': return '#ff6600';
            default: return '#ffffff';
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new MTGPackOpener();
});
