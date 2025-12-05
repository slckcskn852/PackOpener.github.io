// TCG Pack Opener - Main Application
// Supports MTG, Pokemon, Yu-Gi-Oh, One Piece

class TCGPackOpener {
    constructor() {
        this.currentGame = null;
        this.setsData = [];
        this.currentSet = null;
        this.currentCards = [];
        this.tearProgress = 0;
        this.isDragging = false;
        this.startX = 0;
        this.packType = 'play';
        this.packState = 'initial'; // initial, tearing, torn
        
        // Game Configurations
        this.gameConfigs = {
            mtg: {
                name: "Magic: The Gathering",
                theme: "mtg-theme",
                api: {
                    sets: 'https://api.scryfall.com/sets',
                    cards: 'https://api.scryfall.com/cards/search'
                },
                packTypes: {
                    play: { name: 'Play Booster', count: 14, description: '14 cards including 1 rare/mythic' },
                    draft: { name: 'Draft Booster', count: 15, description: '15 cards for drafting' },
                    collector: { name: 'Collector Booster', count: 15, description: 'Premium foil cards' }
                }
            },
            pokemon: {
                name: "Pokémon TCG",
                theme: "pokemon-theme",
                api: {
                    sets: 'https://api.pokemontcg.io/v2/sets',
                    cards: 'https://api.pokemontcg.io/v2/cards'
                },
                packTypes: {
                    standard: { name: 'Booster Pack', count: 10, description: '10 cards including 1 rare' }
                }
            },
            yugioh: {
                name: "Yu-Gi-Oh!",
                theme: "yugioh-theme",
                api: {
                    sets: 'https://db.ygoprodeck.com/api/v7/cardsets.php',
                    cards: 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
                },
                packTypes: {
                    standard: { name: 'Booster Pack', count: 9, description: '9 cards per pack' }
                }
            },
            onepiece: {
                name: "One Piece TCG",
                theme: "onepiece-theme",
                api: {
                    // Mock API for now
                    sets: 'mock',
                    cards: 'mock'
                },
                packTypes: {
                    standard: { name: 'Booster Pack', count: 12, description: '12 cards per pack' }
                }
            }
        };
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        // Start at game selection, so no initial loadSets call
    }

    cacheElements() {
        // App Container
        this.appContainer = document.getElementById('appContainer');
        this.headerTitle = document.getElementById('headerTitle');
        this.headerSubtitle = document.getElementById('headerSubtitle');

        // Sections
        this.gameSelection = document.getElementById('gameSelection');
        this.setSelection = document.getElementById('setSelection');
        this.packArea = document.getElementById('packArea');
        this.cardsArea = document.getElementById('cardsArea');
        
        // Game Selection
        this.gamesGrid = document.getElementById('gamesGrid');
        this.gameCards = document.querySelectorAll('.game-card');

        // Set selection
        this.setsGrid = document.getElementById('setsGrid');
        this.setSearch = document.getElementById('setSearch');
        this.setSelectionTitle = document.getElementById('setSelectionTitle');
        
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
        this.gameBrandLogo = document.getElementById('gameBrandLogo');
        this.packBackLogo = document.getElementById('packBackLogo');
        this.packBackText = document.getElementById('packBackText');
        
        this.currentSetName = document.getElementById('currentSetName');
        this.currentSetInfo = document.getElementById('currentSetInfo');
        this.instructions = document.getElementById('instructions');
        this.instructionText = document.getElementById('instructionText');
        
        // Pack Type Selection Container
        this.packTypeSelection = document.getElementById('packTypeSelection');
        
        // Tear zone elements
        this.tearZone = document.getElementById('tearZone');
        this.tearStrip = document.getElementById('tearStrip');
        this.tearStripPulled = document.getElementById('tearStripPulled');
        this.tearProgressBar = document.getElementById('tearProgressBar');
        
        // Cards area
        this.cardsGrid = document.getElementById('cardsGrid');
        this.rarityBreakdown = document.getElementById('rarityBreakdown');
        
        // Buttons
        this.backToGamesButton = document.getElementById('backToGamesButton');
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
        // Game Selection
        this.gameCards.forEach(card => {
            card.addEventListener('click', () => this.selectGame(card.dataset.game));
        });

        // Search
        this.setSearch.addEventListener('input', (e) => this.filterSets(e.target.value));
        
        // Tear zone drag events
        this.tearZone.addEventListener('mousedown', (e) => this.startTear(e));
        this.tearZone.addEventListener('touchstart', (e) => this.startTear(e));
        
        document.addEventListener('mousemove', (e) => this.continueTear(e));
        document.addEventListener('touchmove', (e) => this.continueTear(e));
        
        document.addEventListener('mouseup', () => this.endTear());
        document.addEventListener('touchend', () => this.endTear());
        
        // Navigation buttons
        this.backToGamesButton.addEventListener('click', () => this.showGameSelection());
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

    selectGame(gameId) {
        this.currentGame = gameId;
        const config = this.gameConfigs[gameId];
        
        // Apply Theme
        this.appContainer.className = 'app-container'; // Reset
        this.appContainer.classList.add(config.theme);
        
        // Update Header
        this.headerTitle.textContent = config.name;
        this.headerSubtitle.textContent = `Select a set to start opening ${config.name} packs`;
        
        // Update Set Selection Title
        this.setSelectionTitle.textContent = `Choose Your ${config.name} Set`;
        
        // Load Sets
        this.loadSets();
        
        // Show Set Selection
        this.showSetSelection();
    }

    showGameSelection() {
        this.gameSelection.style.display = 'block';
        this.setSelection.style.display = 'none';
        this.packArea.style.display = 'none';
        this.cardsArea.style.display = 'none';
        
        // Reset Header
        this.headerTitle.textContent = 'TCG Pack Opener';
        this.headerSubtitle.textContent = 'Choose your game and experience the thrill of opening packs';
        this.appContainer.className = 'app-container';
    }

    selectPackType(type) {
        this.packType = type;
        const btns = this.packTypeSelection.querySelectorAll('.pack-type-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        this.updatePackDisplay();
    }

    async loadSets() {
        this.setsGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading ${this.gameConfigs[this.currentGame].name} sets...</p>
            </div>
        `;

        try {
            let sets = [];
            
            if (this.currentGame === 'mtg') {
                const response = await fetch(this.gameConfigs.mtg.api.sets);
                const data = await response.json();
                sets = data.data.filter(set => 
                    set.card_count > 0 && 
                    ['core', 'expansion', 'draft_innovation', 'masters', 'funny'].includes(set.set_type) &&
                    !set.digital
                ).sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
                
            } else if (this.currentGame === 'pokemon') {
                    try {
                        const response = await fetch(this.gameConfigs.pokemon.api.sets + '?orderBy=-releaseDate');
                        if (!response.ok) throw new Error('Pokemon sets fetch failed');
                        const data = await response.json();
                        sets = data.data;
                    } catch (err) {
                        console.warn('Pokemon API failed, using fallback sets');
                        // Minimal fallback so the UI still works without the API
                        sets = [
                            { id: 'sv8', name: 'Stellar Crown', releaseDate: '2024/11/08', total: 190, images: { symbol: 'https://images.pokemontcg.io/sv8/symbol.png', logo: 'https://images.pokemontcg.io/sv8/logo.png' } },
                            { id: 'sv7', name: 'Surging Sparks', releaseDate: '2024/09/13', total: 182, images: { symbol: 'https://images.pokemontcg.io/sv7/symbol.png', logo: 'https://images.pokemontcg.io/sv7/logo.png' } },
                            { id: 'sv6', name: 'Twilight Masquerade', releaseDate: '2024/05/24', total: 226, images: { symbol: 'https://images.pokemontcg.io/sv6/symbol.png', logo: 'https://images.pokemontcg.io/sv6/logo.png' } },
                            { id: 'sv5', name: 'Temporal Forces', releaseDate: '2024/03/22', total: 218, images: { symbol: 'https://images.pokemontcg.io/sv5/symbol.png', logo: 'https://images.pokemontcg.io/sv5/logo.png' } },
                            { id: 'sv4', name: 'Paradox Rift', releaseDate: '2023/11/03', total: 266, images: { symbol: 'https://images.pokemontcg.io/sv4/symbol.png', logo: 'https://images.pokemontcg.io/sv4/logo.png' } }
                        ];
                    }
                
            } else if (this.currentGame === 'yugioh') {
                const response = await fetch(this.gameConfigs.yugioh.api.sets);
                const data = await response.json();
                sets = data.sort((a, b) => {
                    const dateA = a.tcg_date ? new Date(a.tcg_date) : new Date(0);
                    const dateB = b.tcg_date ? new Date(b.tcg_date) : new Date(0);
                    return dateB - dateA;
                });
            } else if (this.currentGame === 'onepiece') {
                // Mock Data for One Piece
                sets = [
                    { code: 'OP05', name: 'Awakening of the New Era', released_at: '2023-12-08', card_count: 126, icon: '☠️' },
                    { code: 'OP04', name: 'Kingdoms of Intrigue', released_at: '2023-09-22', card_count: 124, icon: '☠️' },
                    { code: 'OP03', name: 'Pillars of Strength', released_at: '2023-06-30', card_count: 127, icon: '☠️' },
                    { code: 'OP02', name: 'Paramount War', released_at: '2023-03-10', card_count: 121, icon: '☠️' },
                    { code: 'OP01', name: 'Romance Dawn', released_at: '2022-12-02', card_count: 121, icon: '☠️' }
                ];
            }
            
            this.setsData = sets;
            this.renderSets(this.setsData);
        } catch (error) {
            console.error('Failed to load sets:', error);
            this.setsGrid.innerHTML = '<p class="error">Failed to load sets. Please refresh the page.</p>';
        }
    }

    renderSets(sets) {
        this.setsGrid.innerHTML = sets.map(set => {
            let code, name, date, count, icon;
            
            if (this.currentGame === 'mtg') {
                code = set.code;
                name = set.name;
                date = set.released_at;
                count = set.card_count;
                icon = `<img src="${set.icon_svg_uri}" alt="${name} icon" onerror="this.style.display='none'">`;
            } else if (this.currentGame === 'pokemon') {
                code = set.id;
                name = set.name;
                date = set.releaseDate;
                count = set.total;
                icon = `<img src="${set.images.symbol}" alt="${name} icon" onerror="this.style.display='none'">`;
            } else if (this.currentGame === 'yugioh') {
                code = set.set_code;
                name = set.set_name;
                date = set.tcg_date;
                count = set.num_of_cards;
                icon = '<span style="font-size: 2rem;">🔮</span>';
            } else if (this.currentGame === 'onepiece') {
                code = set.code;
                name = set.name;
                date = set.released_at;
                count = set.card_count;
                icon = `<span style="font-size: 2rem;">${set.icon}</span>`;
            }

            return `
                <div class="set-card" data-set-code="${code}">
                    <div class="set-icon">
                        ${icon}
                    </div>
                    <div class="set-details">
                        <h3>${name}</h3>
                        <p>${date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'} • ${count} cards</p>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        this.setsGrid.querySelectorAll('.set-card').forEach(card => {
            card.addEventListener('click', () => this.selectSet(card.dataset.setCode));
        });
    }

    filterSets(query) {
        const filtered = this.setsData.filter(set => {
            let name, code;
            if (this.currentGame === 'mtg') {
                name = set.name; code = set.code;
            } else if (this.currentGame === 'pokemon') {
                name = set.name; code = set.id;
            } else if (this.currentGame === 'yugioh') {
                name = set.set_name; code = set.set_code;
            } else if (this.currentGame === 'onepiece') {
                name = set.name; code = set.code;
            }
            return name.toLowerCase().includes(query.toLowerCase()) || code.toLowerCase().includes(query.toLowerCase());
        });
        this.renderSets(filtered);
    }

    async selectSet(setCode) {
        if (this.currentGame === 'mtg') {
            this.currentSet = this.setsData.find(set => set.code === setCode);
        } else if (this.currentGame === 'pokemon') {
            this.currentSet = this.setsData.find(set => set.id === setCode);
        } else if (this.currentGame === 'yugioh') {
            this.currentSet = this.setsData.find(set => set.set_code === setCode);
        } else if (this.currentGame === 'onepiece') {
            this.currentSet = this.setsData.find(set => set.code === setCode);
        }
        
        if (!this.currentSet) return;
        
        // Update UI
        let name, date;
        if (this.currentGame === 'mtg') {
            name = this.currentSet.name; date = this.currentSet.released_at;
        } else if (this.currentGame === 'pokemon') {
            name = this.currentSet.name; date = this.currentSet.releaseDate;
        } else if (this.currentGame === 'yugioh') {
            name = this.currentSet.set_name; date = this.currentSet.tcg_date;
        } else if (this.currentGame === 'onepiece') {
            name = this.currentSet.name; date = this.currentSet.released_at;
        }

        this.currentSetName.textContent = name;
        this.currentSetInfo.textContent = `Released: ${date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}`;
        
        // Fetch a card from the set to use as pack artwork (best effort)
        await this.fetchPackArtwork();
        
        this.updatePackDisplay();
        this.showPackArea();
        this.resetPack();
    }

    async fetchPackArtwork() {
        this.packArtUrl = null;
        try {
            if (this.currentGame === 'mtg') {
                const query = `set:${this.currentSet.code} (rarity:mythic OR rarity:rare) is:booster`;
                const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=random`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data?.length > 0) {
                        const card = data.data.find(c => c.image_uris?.art_crop);
                        if (card) this.packArtUrl = card.image_uris.art_crop;
                    }
                }
            } else if (this.currentGame === 'pokemon') {
                // Try a lightweight request; if blocked, fall back to set logo
                const response = await fetch(`${this.gameConfigs.pokemon.api.cards}?q=set.id:${this.currentSet.id}&pageSize=1&page=${Math.floor(Math.random() * 5) + 1}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data?.length > 0 && data.data[0].images?.large) {
                        this.packArtUrl = data.data[0].images.large;
                    }
                }
                if (!this.packArtUrl && this.currentSet.images?.logo) {
                    this.packArtUrl = this.currentSet.images.logo;
                }
            } else if (this.currentGame === 'yugioh') {
                const response = await fetch(`${this.gameConfigs.yugioh.api.cards}?cardset=${encodeURIComponent(this.currentSet.set_name)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data?.length > 0) {
                        const randomCard = data.data[Math.floor(Math.random() * data.data.length)];
                        this.packArtUrl = randomCard.card_images[0].image_url_cropped || randomCard.card_images[0].image_url;
                    }
                }
            }
        } catch (error) {
            console.log('Could not fetch pack artwork', error);
        }
    }

    updatePackDisplay() {
        if (!this.currentSet) return;
        
        const gameConfig = this.gameConfigs[this.currentGame];
        
        // Ensure pack type is valid for this game
        if (!gameConfig.packTypes[this.packType]) {
            this.packType = Object.keys(gameConfig.packTypes)[0];
        }
        
        const packConfig = gameConfig.packTypes[this.packType];
        
        // Render Pack Type Buttons
        this.packTypeSelection.innerHTML = Object.entries(gameConfig.packTypes).map(([type, config]) => `
            <button class="pack-type-btn ${type === this.packType ? 'active' : ''}" data-type="${type}">
                ${config.name}
            </button>
        `).join('');
        
        // Re-bind button events
        this.packTypeSelection.querySelectorAll('.pack-type-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectPackType(btn.dataset.type));
        });

        // Update pack visuals
        let logoHtml = '';
        if (this.currentGame === 'mtg') {
            logoHtml = `<img src="${this.currentSet.icon_svg_uri}" alt="${this.currentSet.name}">`;
        } else if (this.currentGame === 'pokemon') {
            logoHtml = `<img src="${this.currentSet.images.symbol}" alt="${this.currentSet.name}">`;
        } else if (this.currentGame === 'yugioh') {
            logoHtml = '<span style="font-size: 3rem;">🔮</span>';
        } else if (this.currentGame === 'onepiece') {
            logoHtml = `<span style="font-size: 3rem;">${this.currentSet.icon}</span>`;
        }

        this.packSetLogo.innerHTML = logoHtml;
        this.packSetName.textContent = this.currentSetName.textContent;
        this.packTypeLabel.textContent = packConfig.name.toUpperCase();
        this.packCardCount.textContent = `${packConfig.count} CARDS`;
        
        // Update Branding
        this.gameBrandLogo.textContent = gameConfig.name.toUpperCase();
        this.packBackLogo.textContent = this.currentGame === 'mtg' ? 'MTG' : 
                                      this.currentGame === 'pokemon' ? 'POKÉMON' : 
                                      this.currentGame === 'yugioh' ? 'YU-GI-OH!' : 'ONE PIECE';
        
        // Remove previous pack type classes
        this.packFront.className = 'pack-face pack-front'; // Reset
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
        const name = set.name || set.set_name || '';
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const baseHue = hash % 360;
        
        if (this.currentGame === 'mtg') {
            switch (packType) {
                case 'draft':
                    return { gradient: `linear-gradient(180deg, hsl(220, 50%, 45%) 0%, hsl(240, 55%, 35%) 30%, hsl(260, 60%, 25%) 60%, hsl(270, 65%, 18%) 100%)` };
                case 'collector':
                    return { gradient: `linear-gradient(180deg, hsl(45, 80%, 45%) 0%, hsl(35, 70%, 30%) 25%, hsl(25, 60%, 20%) 50%, hsl(0, 0%, 10%) 100%)` };
                default:
                    return { gradient: `linear-gradient(180deg, hsl(${baseHue}, 55%, 40%) 0%, hsl(${(baseHue + 25) % 360}, 65%, 28%) 50%, hsl(${(baseHue + 50) % 360}, 75%, 18%) 100%)` };
            }
        } else if (this.currentGame === 'pokemon') {
            return { gradient: `linear-gradient(180deg, hsl(${baseHue}, 70%, 50%) 0%, hsl(${(baseHue + 40) % 360}, 80%, 40%) 100%)` };
        } else if (this.currentGame === 'yugioh') {
            return { gradient: `linear-gradient(180deg, #b85c00 0%, #8a4500 50%, #5c2e00 100%)` }; // Classic booster color
        } else {
            return { gradient: `linear-gradient(180deg, hsl(${baseHue}, 60%, 40%) 0%, hsl(${(baseHue + 30) % 360}, 70%, 30%) 100%)` };
        }
    }

    showSetSelection() {
        this.gameSelection.style.display = 'none';
        this.setSelection.style.display = 'block';
        this.packArea.style.display = 'none';
        this.cardsArea.style.display = 'none';
    }

    showPackArea() {
        this.gameSelection.style.display = 'none';
        this.setSelection.style.display = 'none';
        this.packArea.style.display = 'flex';
        this.cardsArea.style.display = 'none';
        this.resetPack();
    }

    showCardsArea() {
        this.gameSelection.style.display = 'none';
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
            let cards = [];
            
            if (this.currentGame === 'mtg') {
                const query = `set:${this.currentSet.code} is:booster`;
                const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=random`);
                if (response.ok) {
                    const data = await response.json();
                    cards = data.data;
                } else {
                    // Fallback
                    const fallbackResponse = await fetch(`https://api.scryfall.com/cards/search?q=set:${this.currentSet.code}&order=random`);
                    const fallbackData = await fallbackResponse.json();
                    cards = fallbackData.data;
                }
            } else if (this.currentGame === 'pokemon') {
                const response = await fetch(`${this.gameConfigs.pokemon.api.cards}?q=set.id:${this.currentSet.id}`);
                const data = await response.json();
                cards = data.data;
            } else if (this.currentGame === 'yugioh') {
                const response = await fetch(`${this.gameConfigs.yugioh.api.cards}?cardset=${encodeURIComponent(this.currentSet.set_name)}`);
                const data = await response.json();
                cards = data.data;
            } else if (this.currentGame === 'onepiece') {
                // Mock Cards
                cards = Array(50).fill(0).map((_, i) => ({
                    name: `One Piece Card ${i+1}`,
                    rarity: Math.random() > 0.9 ? 'SR' : Math.random() > 0.7 ? 'R' : Math.random() > 0.4 ? 'UC' : 'C',
                    image: 'https://placehold.co/300x420/111/fff?text=One+Piece+Card'
                }));
            }
            
            if (cards && cards.length > 0) {
                this.currentCards = this.simulateBooster(cards);
            }
        } catch (error) {
            console.error('Failed to load cards:', error);
            this.cardsGrid.innerHTML = '<p class="error">Failed to load cards. Please try again.</p>';
        }
    }

    simulateBooster(cards) {
        const booster = [];
        
        // Helper function to get random cards without duplicates
        const getRandomCards = (pool, count) => {
            if (!pool || pool.length === 0) return [];
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(count, shuffled.length));
        };

        if (this.currentGame === 'mtg') {
            // Separate cards by rarity
            const commons = cards.filter(c => c.rarity === 'common');
            const uncommons = cards.filter(c => c.rarity === 'uncommon');
            const rares = cards.filter(c => c.rarity === 'rare');
            const mythics = cards.filter(c => c.rarity === 'mythic');
            const lands = cards.filter(c => c.type_line && c.type_line.includes('Basic Land'));
            
            // Build booster based on pack type
            switch (this.packType) {
                case 'play':
                    booster.push(...getRandomCards(commons, 6));
                    booster.push(...getRandomCards(uncommons, 3));
                    if (Math.random() < (1/7) && mythics.length > 0) booster.push(getRandomCards(mythics, 1)[0]);
                    else if (rares.length > 0) booster.push(getRandomCards(rares, 1)[0]);
                    if (lands.length > 0) booster.push(getRandomCards(lands, 1)[0]);
                    else if (commons.length > 0) booster.push(getRandomCards(commons, 1)[0]);
                    const wildcardPool = [...commons, ...uncommons];
                    booster.push(...getRandomCards(wildcardPool, 3));
                    break;
                case 'draft':
                    booster.push(...getRandomCards(commons, 10));
                    booster.push(...getRandomCards(uncommons, 3));
                    if (Math.random() < 0.125 && mythics.length > 0) booster.push(getRandomCards(mythics, 1)[0]);
                    else if (rares.length > 0) booster.push(getRandomCards(rares, 1)[0]);
                    if (lands.length > 0) booster.push(getRandomCards(lands, 1)[0]);
                    break;
                case 'collector':
                    const collectorMythics = getRandomCards(mythics, 2);
                    const collectorRares = getRandomCards(rares, 4);
                    booster.push(...collectorMythics, ...collectorRares);
                    booster.push(...getRandomCards(uncommons, 5));
                    booster.push(...getRandomCards(commons, 4));
                    break;
            }
        } else if (this.currentGame === 'pokemon') {
            const commons = cards.filter(c => c.rarity === 'Common');
            const uncommons = cards.filter(c => c.rarity === 'Uncommon');
            const rares = cards.filter(c => ['Rare', 'Rare Holo', 'Rare Ultra', 'Rare Secret'].includes(c.rarity));
            
            booster.push(...getRandomCards(commons, 6));
            booster.push(...getRandomCards(uncommons, 3));
            booster.push(...getRandomCards(rares, 1));
        } else if (this.currentGame === 'yugioh') {
            // Yu-Gi-Oh rarities are complex, simplifying
            const commons = cards.filter(c => !c.card_prices[0].cardmarket_price || c.card_prices[0].cardmarket_price < 1);
            const rares = cards.filter(c => c.card_prices[0].cardmarket_price >= 1);
            
            booster.push(...getRandomCards(commons, 8));
            booster.push(...getRandomCards(rares, 1));
        } else if (this.currentGame === 'onepiece') {
            const commons = cards.filter(c => c.rarity === 'C');
            const uncommons = cards.filter(c => c.rarity === 'UC');
            const rares = cards.filter(c => ['R', 'SR'].includes(c.rarity));
            
            booster.push(...getRandomCards(commons, 8));
            booster.push(...getRandomCards(uncommons, 3));
            booster.push(...getRandomCards(rares, 1));
        }
        
        // Filter out undefined and limit to expected count
        const config = this.gameConfigs[this.currentGame].packTypes[this.packType] || Object.values(this.gameConfigs[this.currentGame].packTypes)[0];
        return booster.filter(c => c !== undefined).slice(0, config.count);
    }

    renderCards() {
        this.cardsGrid.innerHTML = '';
        
        const rarityCounts = {};
        
        this.currentCards.forEach((card, index) => {
            let imageUri = '';
            let rarity = '';
            
            if (this.currentGame === 'mtg') {
                imageUri = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || 'https://placehold.co/300x420/222/fff?text=MTG+Card';
                rarity = card.rarity;
            } else if (this.currentGame === 'pokemon') {
                imageUri = card.images?.large || 'https://placehold.co/300x420/0044cc/fff?text=Pokemon+Card';
                rarity = card.rarity;
            } else if (this.currentGame === 'yugioh') {
                imageUri = card.card_images?.[0]?.image_url || 'https://placehold.co/300x420/6b2/fff?text=Yu-Gi-Oh+Card';
                rarity = card.card_prices?.[0]?.cardmarket_price > 1 ? 'Rare' : 'Common'; // Simplified
            } else if (this.currentGame === 'onepiece') {
                imageUri = card.image || 'https://placehold.co/300x420/111/fff?text=One+Piece+Card';
                rarity = card.rarity;
            }
            
            rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
            
            const cardSlot = document.createElement('div');
            cardSlot.className = `card-slot ${rarity.toLowerCase().replace(' ', '-')}`;
            cardSlot.dataset.index = index;
            
            // Back Logo Logic
            let backLogo = 'TCG';
            if (this.currentGame === 'mtg') backLogo = 'MTG';
            else if (this.currentGame === 'pokemon') backLogo = 'POKÉMON';
            else if (this.currentGame === 'yugioh') backLogo = 'YU-GI-OH!';
            else if (this.currentGame === 'onepiece') backLogo = 'ONE PIECE';

            cardSlot.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-front">
                        <img src="${imageUri}" alt="${card.name}" loading="lazy">
                    </div>
                    <div class="card-face card-back">
                        <div class="card-back-design">
                            <span class="mtg-back-logo">${backLogo}</span>
                        </div>
                    </div>
                </div>
                <div class="rarity-indicator">${rarity}</div>
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
        // Simplified foil check - assume rares/mythics/holos are foil
        const isFoil = cardSlot.className.includes('rare') || cardSlot.className.includes('mythic') || cardSlot.className.includes('holo') || cardSlot.className.includes('sr');
        
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
        for (const [rarity, count] of Object.entries(counts)) {
            items.push(`<div class="rarity-item"><div class="rarity-dot ${rarity.toLowerCase().replace(' ', '-')}"></div><span>${count} ${rarity}</span></div>`);
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
        let imageUri = '';
        let name = '';
        let type = '';
        let rarity = '';
        let text = '';
        let flavor = '';

        if (this.currentGame === 'mtg') {
            imageUri = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large || card.image_uris?.normal || '';
            name = card.name;
            type = card.type_line;
            rarity = card.rarity;
            text = card.oracle_text;
            flavor = card.flavor_text;
        } else if (this.currentGame === 'pokemon') {
            imageUri = card.images.large;
            name = card.name;
            type = card.supertype + ' - ' + card.subtypes?.join(', ');
            rarity = card.rarity;
            text = card.rules?.join('<br>') || '';
            flavor = card.flavorText;
        } else if (this.currentGame === 'yugioh') {
            imageUri = card.card_images[0].image_url;
            name = card.name;
            type = card.type + ' / ' + card.race;
            rarity = card.card_prices[0].cardmarket_price > 1 ? 'Rare' : 'Common';
            text = card.desc;
        } else if (this.currentGame === 'onepiece') {
            imageUri = card.image;
            name = card.name;
            rarity = card.rarity;
        }

        this.modalCardImage.src = imageUri;
        this.modalCardInfo.innerHTML = `
            <h3>${name}</h3>
            <p>${type || ''}</p>
            <p style="color: ${this.getRarityColor(rarity)}; font-weight: bold;">${rarity?.toUpperCase() || ''}</p>
            ${text ? `<p style="margin-top: 15px; font-size: 0.95rem; line-height: 1.5;">${text}</p>` : ''}
            ${flavor ? `<p style="margin-top: 10px; font-style: italic; color: #888;">"${flavor}"</p>` : ''}
        `;
        
        this.cardModal.classList.add('active');
    }

    closeModal() {
        this.cardModal.classList.remove('active');
    }

    getRarityColor(rarity) {
        if (!rarity) return '#ffffff';
        const r = rarity.toLowerCase();
        if (r.includes('mythic') || r.includes('secret') || r.includes('sr')) return '#ff6600';
        if (r.includes('rare') || r.includes('holo') || r.includes('r')) return '#ffd700';
        if (r.includes('uncommon') || r.includes('uc')) return '#a8a8a8';
        return '#c0c0c0';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TCGPackOpener();
});
