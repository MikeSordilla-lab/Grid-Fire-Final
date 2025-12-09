        // ----------------------------------------------------------
        // BASIC CANVAS + UI
        // ----------------------------------------------------------

        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");

        const startScreen = document.getElementById("startScreen");
        const startBtn = document.getElementById("startBtn");
        const gameOverEl = document.getElementById("gameOver");
        const finalScoreEl = document.getElementById("finalScore");
        const finalCoinsEl = document.getElementById("finalCoins");
        const restartBtn = document.getElementById("restartBtn"); // Hidden one
        const restartBtn2 = document.getElementById("restartBtn2"); // Game Over one
        
        // HUD Elements - Updated for new UI
        const scoreValueEl = document.querySelector("#score .hud-value");
        const coinsValueEl = document.querySelector("#coins .hud-value");
        const healthTextEl = document.getElementById("healthText");
        const ultimateTextEl = document.getElementById("ultimateText");
        const ammoValueEl = document.getElementById("ammoValue");
        
        const hotbarEl = document.getElementById("hotbar");
        const healthBar = document.getElementById("healthBar");

        
        // XP Elements
        const xpBarFill = document.getElementById("xpBarFill");
        const levelBadge = document.getElementById("levelBadge");
        const levelUpNotification = document.getElementById("levelUpNotification");
        
        const waveNumEl = document.getElementById("waveNum");
        const enemyCountEl = document.getElementById("enemyCount");
        const waveIndicator = document.getElementById("waveIndicator");
        
        const upgradeShop = document.getElementById("upgradeShop");
        const closeShopBtn = document.getElementById("closeShop");
        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        
        const weaponSwitchIndicator = document.getElementById('weaponSwitchIndicator');
        const ultimateReadyIndicator = document.getElementById('ultimateReadyIndicator');

        let width = canvas.width;
        let height = canvas.height;

        // ----------------------------------------------------------
        // GAME STATE
        // ----------------------------------------------------------

        let running = false;
        let lastTime = 0;
        let spawnTimer = 0;
        let spawnInterval = 1000;
        let score = 0;
        let coins = 0;
        let wave = 1;
        let enemiesInWave = 5;
        let enemiesSpawnedInCurrentWave = 0;
        let enemiesDefeated = 0;

        let shopOpen = false;
        
        // XP System
        let xp = 0;
        let level = 1;
        let xpToNextLevel = 100;

        // Player object
        const player = {
            x: width / 2,
            y: height / 2,
            r: 18,
            speed: 220,
            acceleration: 2000,
            friction: 8,
            vx: 0,
            vy: 0,
            health: 100,
            maxHealth: 100,
            ultimateReady: true,
            ultimateCooldown: 0,
            ultimateMaxCooldown: 30000, // 30 seconds
            // Melee animation state
            swinging: false,
            swingProgress: 0,
            swingDuration: 0.2, // seconds

            swingAngle: 0,
            // Dash
            dashCooldown: 0,
            dashMaxCooldown: 3000,
            dashing: false,
            dashTime: 0,
            dashDuration: 0.15,
            dashSpeed: 800
        };

        // Weapon upgrades
        const upgrades = {
            damage: { level: 1, cost: 50, multiplier: 1.2 },
            fireRate: { level: 1, cost: 40, multiplier: 0.8 },
            magazine: { level: 1, cost: 60, multiplier: 1.5 }
        };

        // Inputs
        const keys = {};
        let mouse = { x: 0, y: 0, down: false };

        // Arrays
        const bullets = [];
        const enemyBullets = [];
        const enemies = [];
        const groundLoot = [];
        const healthItems = [];
        const coinsList = [];
        const effects = []; // For visual effects
        const shockWaves = []; // For shock wave ultimate
        const muzzleFlashes = []; // Visual only
        const obstacles = []; // Map obstacles

        // Enemy Types
        const ENEMY_TYPES = {
            STANDARD: { color: "#ff0055", hp: 20, speed: 80, r: 15, score: 10 },
            TANK: { color: "#d97706", hp: 60, speed: 40, r: 25, score: 30 },
            EXPLODER: { color: "#9333ea", hp: 10, speed: 110, r: 12, score: 20, range: 60 },
            RANGED: { color: "#10b981", hp: 30, speed: 70, r: 15, score: 25, range: 250, cooldown: 2500 }
        };

        // ----------------------------------------------------------
        // INVENTORY + HOTBAR
        // ----------------------------------------------------------

        const inventory = new Array(8).fill(null);
        let selectedSlot = 0;

        // Default melee weapon
        const meleeWeapon = {
            name: "Knife",
            type: "melee",
            dmg: 25,
            range: 80,
            cooldown: 350,
            lastAttack: 0,
            ammo: Infinity,
            reserve: Infinity,
            level: 1
        };

        // Example gun templates
        function createGun(name, dmg, speed, magSize, reserveAmmo, projectileCount = 1, spread = 0) {
            return {
                name,
                type: "gun",
                dmg,
                speed,
                bulletSpeed: 1200,
                magSize,
                ammo: magSize,
                reserve: reserveAmmo,
                reloadTime: 900,
                reloading: false,
                level: 1,
                projectileCount,
                spread
            };
        }

        // Create hotbar slots once and reuse them
        function initializeHotbar() {
            hotbarEl.innerHTML = "";
            for (let i = 0; i < 8; i++) {
                const slot = document.createElement("div");
                slot.className = "slot";
                slot.dataset.index = i;
                
                // Add both mousedown and click events for maximum compatibility
                slot.addEventListener('mousedown', handleSlotClick);
                slot.addEventListener('click', handleSlotClick);
                
                hotbarEl.appendChild(slot);
            }
            updateHotbarUI();
        }

        // Handle slot clicks
        function handleSlotClick(e) {
            // Prevent the event from bubbling to the canvas
            e.preventDefault();
            e.stopPropagation();
            
            const index = parseInt(e.currentTarget.dataset.index);
            if (inventory[index]) {
                selectedSlot = index;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }
        }

        // ----------------------
        // Hotbar UI rendering
        // ----------------------
        function updateHotbarUI() {
            const slots = document.querySelectorAll('.slot');
            
            for (let i = 0; i < 8; i++) {
                const slot = slots[i];
                
                // Reset classes
                slot.className = "slot";
                if (i === selectedSlot) slot.classList.add("selected");
                if (!inventory[i]) slot.classList.add("empty");
                
                // Update content
                if (inventory[i]) {
                    // Clear existing content
                    slot.innerHTML = "";
                    
                    const nameSpan = document.createElement("span");
                    nameSpan.className = "slot-name";
                    nameSpan.textContent = inventory[i].name;
                    
                    const ammoSpan = document.createElement("span");
                    ammoSpan.className = "slot-ammo";
                    
                    if (inventory[i].type === "melee") {
                        ammoSpan.textContent = "MELEE";
                    } else {
                        ammoSpan.textContent = `${inventory[i].ammo}/${inventory[i].reserve}`;
                    }
                    
                    const levelSpan = document.createElement("span");
                    levelSpan.className = "slot-level";
                    levelSpan.textContent = `Lv${inventory[i].level}`;
                    
                    slot.appendChild(nameSpan);
                    slot.appendChild(ammoSpan);
                    slot.appendChild(levelSpan);
                } else {
                    slot.textContent = "-";
                }
            }
        }

        // Initialize the hotbar once
        initializeHotbar();

        // ----------------------------------------------------------
        // UTILS
        // ----------------------------------------------------------

        function rand(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        function dist(a, b) {
            return Math.hypot(a.x - b.x, a.y - b.y);
        }

        function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
            return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
        }

        function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
            const closestX = Math.max(rx, Math.min(cx, rx + rw));
            const closestY = Math.max(ry, Math.min(cy, ry + rh));
            const distanceX = cx - closestX;
            const distanceY = cy - closestY;
            return (distanceX * distanceX) + (distanceY * distanceY) < (cr * cr);
        }

        function generateMap() {
            obstacles.length = 0;
            
            // 30% chance for open map (no obstacles)
            if (Math.random() < 0.3) return;

            const type = Math.random();
            
            if (type < 0.33) {
                // Pillars
                obstacles.push({ x: width * 0.2, y: height * 0.2, w: 60, h: 60, color: "#334155" });
                obstacles.push({ x: width * 0.8 - 60, y: height * 0.2, w: 60, h: 60, color: "#334155" });
                obstacles.push({ x: width * 0.2, y: height * 0.8 - 60, w: 60, h: 60, color: "#334155" });
                obstacles.push({ x: width * 0.8 - 60, y: height * 0.8 - 60, w: 60, h: 60, color: "#334155" });
                // Removed center obstacle to avoid spawning on player
                // obstacles.push({ x: width * 0.5 - 30, y: height * 0.5 - 30, w: 60, h: 60, color: "#334155" });
            } else if (type < 0.66) {
                // Walls
                obstacles.push({ x: width * 0.3, y: height * 0.2, w: 20, h: height * 0.6, color: "#334155" });
                obstacles.push({ x: width * 0.7, y: height * 0.2, w: 20, h: height * 0.6, color: "#334155" });
            } else {
                // Scattered
                for (let i = 0; i < 8; i++) {
                    let attempts = 0;
                    let valid = false;
                    let obj = {};
                    
                    while (!valid && attempts < 10) {
                        attempts++;
                        obj = {
                            x: rand(50, width - 100),
                            y: rand(50, height - 100),
                            w: rand(40, 80),
                            h: rand(40, 80),
                            color: "#334155"
                        };
                        
                        // Check if it overlaps player spawn (center)
                        // Player starts at width/2, height/2 with radius 18. Give it some breathing room (e.g. 100px radius)
                        const centerX = width / 2;
                        const centerY = height / 2;
                        
                        // Simple rect overlap check with a "safe zone" box
                        if (!rectIntersect(obj.x, obj.y, obj.w, obj.h, centerX - 60, centerY - 60, 120, 120)) {
                            valid = true;
                        }
                    }
                    
                    if (valid) {
                        obstacles.push(obj);
                    }
                }
            }
        }
        
        function createScorePopup(x, y, value) {
            const popup = document.createElement("div");
            popup.className = "score-popup";
            popup.textContent = `+${value}`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1000);
        }
        
        function createCoinPopup(x, y, value) {
            const popup = document.createElement("div");
            popup.className = "coin-popup";
            popup.textContent = `+${value}🪙`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1000);
        }
        
        function createAmmoPopup(x, y, weaponName, amount) {
            const popup = document.createElement("div");
            popup.className = "ammo-popup";
            popup.textContent = `+${amount} ${weaponName} Ammo`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createHealthPopup(x, y, amount) {
            const popup = document.createElement("div");
            popup.className = "health-popup";
            popup.textContent = `+${amount} Health`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createUltimatePopup(x, y) {
            const popup = document.createElement("div");
            popup.className = "ultimate-popup";
            popup.textContent = `SHOCK WAVE!`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createHitEffect(x, y) {
            const effect = document.createElement("div");
            effect.className = "enemy-hit";
            effect.style.left = `${x - 10}px`;
            effect.style.top = `${y - 10}px`;
            document.getElementById("ui").appendChild(effect);
            
            setTimeout(() => {
                effect.remove();
            }, 300);
        }
        
        function showWeaponSwitchIndicator() {
            const weapon = inventory[selectedSlot];
            if (weapon) {
                weaponSwitchIndicator.textContent = `EQUIPPED: ${weapon.name.toUpperCase()}`;
                weaponSwitchIndicator.classList.add('show');
                
                setTimeout(() => {
                    weaponSwitchIndicator.classList.remove('show');
                }, 1500);
            }
        }
        
        function hasWeapon(weaponName) {
            return inventory.some(weapon => weapon && weapon.name === weaponName);
        }
        
        function getWeaponSlot(weaponName) {
            return inventory.findIndex(weapon => weapon && weapon.name === weaponName);
        }
        
        function showAmmoAdded(slotIndex, amount) {
            const slots = document.querySelectorAll('.slot');
            if (slots[slotIndex]) {
                slots[slotIndex].classList.add('ammo-added');
                setTimeout(() => {
                    slots[slotIndex].classList.remove('ammo-added');
                }, 500);
            }
        }

        // ----------------------------------------------------------
        // SHOCK WAVE ULTIMATE
        // ----------------------------------------------------------

        function activateShockWave() {
            if (!player.ultimateReady || shopOpen || !running) return;
            
            player.ultimateReady = false;
            player.ultimateCooldown = player.ultimateMaxCooldown;
            
            // Create shock wave effect
            shockWaves.push({
                x: player.x,
                y: player.y,
                radius: 0,
                maxRadius: 300,
                speed: 10,
                damage: 50,
                active: true
            });
            
            // Visual and audio feedback
            createUltimatePopup(player.x, player.y);
            
            // Update UI
            updateUI();
        }
        
        function updateShockWaves(delta) {
            for (let i = shockWaves.length - 1; i >= 0; i--) {
                const wave = shockWaves[i];
                
                // Expand the wave
                wave.radius += wave.speed;
                
                // Check collision with enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const distance = dist(wave, enemy);
                    
                    if (distance < wave.radius + enemy.r) {
                        // Damage enemy
                        enemy.hp -= wave.damage;
                        createHitEffect(enemy.x, enemy.y);
                        
                        // Push enemy away from center
                        const angle = Math.atan2(enemy.y - wave.y, enemy.x - wave.x);
                        const pushForce = 15;
                        enemy.x += Math.cos(angle) * pushForce;
                        enemy.y += Math.sin(angle) * pushForce;
                        
                        if (enemy.hp <= 0) {
                            score += 10;
                            coins += 5;
                            createScorePopup(enemy.x, enemy.y, 10);
                            createCoinPopup(enemy.x, enemy.y, 5);
                            dropLoot(enemy.x, enemy.y);
                            enemies.splice(j, 1);
                            enemiesDefeated++;
                            addXP(enemy.score || 10);
                            checkWaveComplete();
                        }
                    }
                }
                
                // Remove wave if it reaches max radius
                if (wave.radius >= wave.maxRadius) {
                    shockWaves.splice(i, 1);
                }
            }
            
            // Update ultimate cooldown
            if (!player.ultimateReady) {
                player.ultimateCooldown -= delta * 1000;
                
                if (player.ultimateCooldown <= 0) {
                    player.ultimateReady = true;
                    player.ultimateCooldown = 0;
                    
                    // Show ready indicator
                    ultimateReadyIndicator.classList.add('show');
                    setTimeout(() => {
                        ultimateReadyIndicator.classList.remove('show');
                    }, 3000);
                }
                
                updateUI();
            }
        }
        
        function drawShockWaves() {
            for (const wave of shockWaves) {
                // Draw expanding circle
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(236, 72, 153, ${0.7 - (wave.radius / wave.maxRadius) * 0.6})`;
                ctx.lineWidth = 8;
                ctx.stroke();
                
                // Draw inner glow
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius - 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - (wave.radius / wave.maxRadius) * 0.4})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Draw outer glow
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 105, 180, ${0.3 - (wave.radius / wave.maxRadius) * 0.2})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // ----------------------------------------------------------
        // UPGRADE SYSTEM
        // ----------------------------------------------------------

        function openUpgradeShop() {
            shopOpen = true;
            upgradeShop.classList.remove("hidden");
            updateUpgradeButtons();
        }
        
        function closeUpgradeShop() {
            shopOpen = false;
            upgradeShop.classList.add("hidden");
            startNextWave();
        }
        
        function updateUpgradeButtons() {
            upgradeButtons.forEach(button => {
                const upgradeType = button.dataset.upgrade;
                const upgrade = upgrades[upgradeType];
                const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level - 1));
                
                // Find parent card body
                const cardBody = button.closest('.card-body');
                if (cardBody) {
                    cardBody.querySelector('.upgrade-cost').textContent = cost;
                    cardBody.querySelector('.upgrade-level').textContent = `Level: ${upgrade.level}`;
                }
                
                if (coins < cost) {
                    button.disabled = true;
                } else {
                    button.disabled = false;
                }
            });
        }
        
        function purchaseUpgrade(type) {
            const upgrade = upgrades[type];
            const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level - 1));
            
            if (coins >= cost) {
                coins -= cost;
                upgrade.level++;
                
                // Apply upgrade to all weapons
                inventory.forEach(weapon => {
                    if (weapon) {
                        switch(type) {
                            case 'damage':
                                weapon.dmg = Math.floor(weapon.dmg * upgrade.multiplier);
                                break;
                            case 'fireRate':
                                if (weapon.type === 'melee') {
                                    weapon.cooldown = Math.floor(weapon.cooldown * upgrade.multiplier);
                                } else {
                                    weapon.speed = weapon.speed * upgrade.multiplier;
                                }
                                break;
                            case 'magazine':
                                if (weapon.type === 'gun') {
                                    weapon.magSize = Math.floor(weapon.magSize * upgrade.multiplier);
                                    weapon.reserve = Math.floor(weapon.reserve * upgrade.multiplier);
                                }
                                break;
                        }
                        weapon.level = Math.max(weapon.level, upgrade.level);
                    }
                });
                
                updateUI();
                updateUpgradeButtons();
            }
        }
        
        function startNextWave() {
            wave++;
            enemiesInWave = 5 + Math.floor(wave * 2.5); // Slightly more enemies per wave
            enemiesDefeated = 0;
            enemiesSpawnedInCurrentWave = 0;
            spawnInterval = Math.max(200, 1000 - wave * 30); // Cap speed at 200ms
            waveIndicator.textContent = `WAVE ${wave}`;
            waveIndicator.style.opacity = 1;
            setTimeout(() => { waveIndicator.style.opacity = 0.8; }, 2000); // Keep it visible but slightly faded
        }
        
        function checkWaveComplete() {
            // Logic:
            // 1. Defeated enough enemies
            // 2. OR We spawned enough enemies AND they are all gone (failsafe for glitches)
            if ((enemiesDefeated >= enemiesInWave && enemies.length === 0) || 
                (enemiesSpawnedInCurrentWave >= enemiesInWave && enemies.length === 0)) {
                openUpgradeShop();
            }
        }

        // ----------------------------------------------------------
        // INPUT HANDLING
        // ----------------------------------------------------------

        window.addEventListener("keydown", (e) => {
            keys[e.key.toLowerCase()] = true;

            // Hotbar switching 1–8
            if (e.key >= "1" && e.key <= "8") {
                selectedSlot = Number(e.key) - 1;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }

            // Shoot (space)
            if (e.code === "Space") {
                e.preventDefault();
                attack();
            }

            // Reload
            if (e.key.toLowerCase() === "r") reloadWeapon();
            
            // Shock Wave Ultimate (Q)
            if (e.key.toLowerCase() === "q") {
                activateShockWave();
            }
        });

        window.addEventListener("keyup", (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
            mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
        });
        
        canvas.addEventListener("mousedown", (e) => {
            // Only register mouse down if not clicking on UI elements
            if (e.target === canvas) {
                mouse.down = true; 
                attack();
            }
        });
        
        window.addEventListener("mouseup", () => { 
            mouse.down = false; 
        });
        
        // Mouse wheel weapon switching
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            
            if (shopOpen) return;
            
            // Determine direction (negative deltaY = scroll up, positive = scroll down)
            const direction = e.deltaY > 0 ? 1 : -1;
            
            // Find the next slot with a weapon
            let newSlot = selectedSlot;
            let attempts = 0;
            
            do {
                newSlot = (newSlot + direction + 8) % 8;
                attempts++;
            } while (inventory[newSlot] === null && attempts < 8);
            
            // If we found a weapon, switch to it
            if (inventory[newSlot] !== null) {
                selectedSlot = newSlot;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }
        });
        
        // Upgrade shop events
        closeShopBtn.addEventListener("click", closeUpgradeShop);
        upgradeButtons.forEach(button => {
            button.addEventListener("click", () => {
                purchaseUpgrade(button.dataset.upgrade);
            });
        });

        // ----------------------------------------------------------
        // START / RESTART
        // ----------------------------------------------------------

        startBtn.addEventListener("click", startGame);
        if(restartBtn) restartBtn.addEventListener("click", restartGame);
        restartBtn2.addEventListener("click", restartGame);

        function startGame() {
            startScreen.classList.add("hidden");
            gameOverEl.classList.add("hidden");
            if(restartBtn) restartBtn.classList.add("hidden");
            running = true;
            reset();
            lastTime = performance.now();
            requestAnimationFrame(loop);
        }

        function restartGame() {
            running = true;
            startScreen.classList.add("hidden");
            gameOverEl.classList.add("hidden");
            if(restartBtn) restartBtn.classList.add("hidden");
            upgradeShop.classList.add("hidden");
            reset();
            lastTime = performance.now();
            requestAnimationFrame(loop);
        }

        function reset() {
            bullets.length = 0;
            enemies.length = 0;
            groundLoot.length = 0;
            healthItems.length = 0;
            coinsList.length = 0;
            effects.length = 0;
            shockWaves.length = 0;
            muzzleFlashes.length = 0;
            enemyBullets.length = 0;
            
            generateMap();

            player.x = width / 2;
            player.y = height / 2;
            player.health = player.maxHealth;
            player.ultimateReady = true;
            player.ultimateCooldown = 0;
            player.swinging = false;
            player.swingProgress = 0;

            score = 0;
            coins = 0;
            wave = 1;
            enemiesInWave = 5;
            enemiesDefeated = 0;
            enemiesSpawnedInCurrentWave = 0;
            shopOpen = false;

            // Reset upgrades
            upgrades.damage.level = 1;
            upgrades.fireRate.level = 1;
            upgrades.magazine.level = 1;

            // Reset inventory
            for (let i = 0; i < 8; i++) inventory[i] = null;
            inventory[0] = {...meleeWeapon};
            
            // GIVE STARTER GUN
            inventory[1] = createGun("Pistol", 15, 400, 12, 48);
            
            selectedSlot = 0;
            updateHotbarUI();

            spawnTimer = 0;
            spawnInterval = 1000;

            waveIndicator.textContent = `WAVE ${wave}`;

            updateUI();
        }

        // ----------------------------------------------------------
        // ATTACK + SHOOTING + RELOAD
        // ----------------------------------------------------------

        function attack() {
            if (!running || shopOpen) return;

            const weapon = inventory[selectedSlot];
            if (!weapon) return;

            // --- MELEE ---
            if (weapon.type === "melee") {
                const now = performance.now();
                if (now - weapon.lastAttack < weapon.cooldown) return;
                weapon.lastAttack = now;
                
                // Start swing animation
                player.swinging = true;
                player.swingProgress = 0;

                // Melee hit detection
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (dist(player, enemies[i]) <= weapon.range) {
                        enemies[i].hp -= weapon.dmg;
                        createHitEffect(enemies[i].x, enemies[i].y);
                        
                        if (enemies[i].hp <= 0) {
                            score += 10;
                            coins += 5;
                            createScorePopup(enemies[i].x, enemies[i].y, 10);
                            createCoinPopup(enemies[i].x, enemies[i].y, 5);
                            dropLoot(enemies[i].x, enemies[i].y);
                            enemies.splice(i, 1);
                            enemiesDefeated++;
                            addXP(enemies[i].score || 10);
                            checkWaveComplete();
                        }
                    }
                }
                return;
            }

            // --- GUN ---
            if (weapon.type === "gun") {
                if (weapon.reloading) return;
                
                // Auto-reload if out of ammo
                if (weapon.ammo <= 0) {
                    if (weapon.reserve > 0) {
                        reloadWeapon();
                    }
                    return;
                }

                weapon.ammo--;

                const baseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
                
                // Muzzle flash
                muzzleFlashes.push({
                    x: player.x + Math.cos(baseAngle) * (player.r + 20),
                    y: player.y + Math.sin(baseAngle) * (player.r + 20),
                    life: 0.05
                });

                // Fire projectiles
                const count = weapon.projectileCount || 1;
                const spread = weapon.spread || 0;
                
                for (let i = 0; i < count; i++) {
                    // Calculate spread angle
                    const angle = baseAngle + (Math.random() - 0.5) * spread;

                    bullets.push({
                        x: player.x + Math.cos(angle) * (player.r + 6),
                        y: player.y + Math.sin(angle) * (player.r + 6),
                        vx: Math.cos(angle) * weapon.bulletSpeed,
                        vy: Math.sin(angle) * weapon.bulletSpeed,
                        r: 5,
                        dmg: weapon.dmg,
                        life: 1200
                    });
                }

                updateUI();
            }
        }

        function reloadWeapon() {
            const w = inventory[selectedSlot];
            if (!w || w.type !== "gun") return;
            if (w.ammo === w.magSize) return;
            if (w.reserve <= 0) return;

            w.reloading = true;

            setTimeout(() => {
                const needed = w.magSize - w.ammo;
                const take = Math.min(needed, w.reserve);
                w.ammo += take;
                w.reserve -= take;
                w.reloading = false;
                updateUI();
            }, w.reloadTime);
        }

        // ----------------------------------------------------------
        // AUTO-PICKUP LOOT
        // ----------------------------------------------------------

        function pickupNearbyLoot() {
            // Pick up weapons and ammo
            for (let i = groundLoot.length - 1; i >= 0; i--) {
                const item = groundLoot[i];
                if (dist(player, item) < 40) {
                    // Check if player already has this weapon type
                    if (hasWeapon(item.weapon.name)) {
                        // Find the existing weapon slot
                        const existingSlot = getWeaponSlot(item.weapon.name);
                        const existingWeapon = inventory[existingSlot];
                        
                        // If it's a gun, add ammo to the existing weapon
                        if (existingWeapon.type === "gun") {
                            // Calculate how much ammo to add (base amount from the loot weapon)
                            const ammoToAdd = item.weapon.reserve;
                            existingWeapon.reserve += ammoToAdd;
                            
                            // Show visual feedback
                            showAmmoAdded(existingSlot, ammoToAdd);
                            createAmmoPopup(player.x, player.y - 30, existingWeapon.name, ammoToAdd);
                            
                            // Remove the loot
                            groundLoot.splice(i, 1);
                        }
                    } else {
                        // New weapon - find empty slot
                        const emptySlot = inventory.findIndex(s => s === null);
                        if (emptySlot !== -1) {
                            inventory[emptySlot] = {
                                ...item.weapon,
                                ...item.weapon,
                                ammo: item.weapon.magSize,
                                reserve: item.weapon.reserve,
                                level: 1 // Reset level for new pickup or keep logic
                            };
                            
                            // Apply upgrades to new weapon
                            if (inventory[emptySlot].type === 'gun') {
                                inventory[emptySlot].magSize = Math.floor(inventory[emptySlot].magSize * Math.pow(upgrades.magazine.multiplier, upgrades.magazine.level - 1));
                                inventory[emptySlot].reserve = Math.floor(inventory[emptySlot].reserve * Math.pow(upgrades.magazine.multiplier, upgrades.magazine.level - 1));
                                inventory[emptySlot].speed = inventory[emptySlot].speed * Math.pow(upgrades.fireRate.multiplier, upgrades.fireRate.level - 1);
                            }
                            inventory[emptySlot].dmg = Math.floor(inventory[emptySlot].dmg * Math.pow(upgrades.damage.multiplier, upgrades.damage.level - 1));
                            inventory[emptySlot].level = Math.max(upgrades.damage.level, upgrades.fireRate.level, upgrades.magazine.level);
                            
                            createAmmoPopup(player.x, player.y - 30, item.weapon.name, "Equipped");
                            groundLoot.splice(i, 1);
                            updateHotbarUI();
                        }
                    }
                }
            }
            
            // Pick up health
            for (let i = healthItems.length - 1; i >= 0; i--) {
                const item = healthItems[i];
                if (dist(player, item) < 30) {
                    if (player.health < player.maxHealth) {
                        player.health = Math.min(player.health + item.value, player.maxHealth);
                        createHealthPopup(player.x, player.y, item.value);
                        healthItems.splice(i, 1);
                        updateUI();
                    }
                }
            }
            
            // Pick up coins
            for (let i = coinsList.length - 1; i >= 0; i--) {
                const coin = coinsList[i];
                if (dist(player, coin) < 30) {
                    coins += coin.value;
                    createCoinPopup(player.x, player.y, coin.value);
                    coinsList.splice(i, 1);
                    updateUI();
                }
            }
        }
        
        function dropLoot(x, y) {
            // Chance to drop weapon
            if (Math.random() < 0.3) {
                const randWeapon = Math.random();
                let weaponType;
                
                if (randWeapon < 0.4) weaponType = createGun("Pistol", 15, 400, 12, 48);
                else if (randWeapon < 0.7) weaponType = createGun("SMG", 8, 70, 30, 120); // Faster fire rate (70ms)
                else if (randWeapon < 0.9) weaponType = createGun("Shotgun", 10, 800, 6, 24, 5, 0.3); // 5 projectiles, 0.3 spread
                else weaponType = createGun("Sniper", 80, 1500, 5, 15);
                
                groundLoot.push({ x, y, weapon: weaponType });
            }
            
            // Chance to drop health
            if (Math.random() < 0.2) {
                healthItems.push({ x: x + rand(-20, 20), y: y + rand(-20, 20), value: 25 });
            }
            
            // Always drop coins? or chance
            if (Math.random() < 0.5) {
                coinsList.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), value: rand(1, 5) | 0 });
            }
        }

        // ----------------------------------------------------------
        // GAME LOOP
        // ----------------------------------------------------------

        function update(delta) {
            // Player movement
            let dx = 0;
            let dy = 0;
            if (keys["w"]) dy = -1;
            if (keys["s"]) dy = 1;
            if (keys["a"]) dx = -1;
            if (keys["d"]) dx = 1;

            // Normalize diagonal
            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len;
                dy /= len;
            }

            // Apply acceleration
            if (dx !== 0 || dy !== 0) {
                player.vx += dx * player.acceleration * delta;
                player.vy += dy * player.acceleration * delta;
            }

            // Apply friction
            player.vx -= player.vx * player.friction * delta;
            player.vy -= player.vy * player.friction * delta;

            // Cap speed
            const currentSpeed = Math.hypot(player.vx, player.vy);
            // Cap speed ONLY if not dashing
            if (!player.dashing && currentSpeed > player.speed) {
                const scale = player.speed / currentSpeed;
                player.vx *= scale;
                player.vy *= scale;
            }

            // Stop completely if very slow
            if (Math.abs(player.vx) < 5) player.vx = 0;
            if (Math.abs(player.vy) < 5) player.vy = 0;

            // Move X
            player.x += player.vx * delta;

            for (const obs of obstacles) {
                if (circleRectCollide(player.x, player.y, player.r, obs.x, obs.y, obs.w, obs.h)) {
                    player.x -= player.vx * delta;
                    player.vx = 0;
                    break;
                }
            }

            // Move Y
            player.y += player.vy * delta;
            for (const obs of obstacles) {
                if (circleRectCollide(player.x, player.y, player.r, obs.x, obs.y, obs.w, obs.h)) {
                    player.y -= player.vy * delta;
                    player.vy = 0;
                    break;
                }
            }

            // Bounds
            player.x = Math.max(player.r, Math.min(width - player.r, player.x));
            player.y = Math.max(player.r, Math.min(height - player.r, player.y));
            
            // Update Dash
            if (player.dashing) {
                player.dashTime -= delta;
                if (player.dashTime <= 0) {
                    player.dashing = false;
                    player.vx = 0;
                    player.vy = 0;
                }
            } else if (player.dashCooldown > 0) {
                player.dashCooldown -= delta * 1000;
            }
            
            if (keys['shift'] && player.dashCooldown <= 0 && !player.dashing && (dx !== 0 || dy !== 0)) {
                // Activate dash
                player.dashing = true;
                player.dashTime = player.dashDuration;
                player.dashCooldown = player.dashMaxCooldown;
                
                // Boost velocity in INPUT direction (dx, dy are already normalized input vectors)
                player.vx = dx * player.dashSpeed;
                player.vy = dy * player.dashSpeed;
            }
            
            // Update swing animation
            if (player.swinging) {
                player.swingProgress += delta / player.swingDuration;
                if (player.swingProgress >= 1) {
                    player.swinging = false;
                    player.swingProgress = 0;
                }
            }
            
            // Update muzzle flashes
            for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
                muzzleFlashes[i].life -= delta;
                if (muzzleFlashes[i].life <= 0) {
                    muzzleFlashes.splice(i, 1);
                }
            }

            // Bullets (Player)
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx * delta;
                b.y += b.vy * delta;
                b.life -= delta * 1000;

                // Obstacle collision
                let hitWall = false;
                for (const obs of obstacles) {
                    if (circleRectCollide(b.x, b.y, b.r, obs.x, obs.y, obs.w, obs.h)) {
                        hitWall = true;
                        break;
                    }
                }
                if (hitWall) {
                    bullets.splice(i, 1);
                    continue;
                }

                if (b.life <= 0 || b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
                    bullets.splice(i, 1);
                    continue;
                }

                // Collision with enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (dist(b, e) < b.r + e.r) {
                        e.hp -= b.dmg;
                        createHitEffect(e.x, e.y);
                        
                        if (e.hp <= 0) {
                            score += 10;
                            coins += 5;
                            createScorePopup(e.x, e.y, 10);
                            createCoinPopup(e.x, e.y, 5);
                            dropLoot(e.x, e.y);
                            enemies.splice(j, 1);
                            enemiesDefeated++;
                            addXP(e.score || 10);
                            checkWaveComplete();
                        }
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }

            // Enemy Bullets
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                const b = enemyBullets[i];
                b.x += b.vx * delta;
                b.y += b.vy * delta;
                b.life -= delta * 1000;

                // Obstacle collision
                let hitWall = false;
                for (const obs of obstacles) {
                    if (circleRectCollide(b.x, b.y, b.r, obs.x, obs.y, obs.w, obs.h)) {
                        hitWall = true;
                        break;
                    }
                }
                if (hitWall) {
                    enemyBullets.splice(i, 1);
                    continue;
                }

                if (b.life <= 0 || b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
                    enemyBullets.splice(i, 1);
                    continue;
                }

                // Collision with Player
                if (dist(b, player) < b.r + player.r) {
                    player.health -= b.dmg;
                    createHitEffect(player.x, player.y);
                    if (player.health <= 0) gameOver();
                    updateUI();
                    enemyBullets.splice(i, 1);
                }
            }

            // Enemies Spawning Logic
            spawnTimer += delta * 1000;
            // Spawn if: Timer ready AND we haven't spawned enough for this wave yet
            if (spawnTimer > spawnInterval && enemiesSpawnedInCurrentWave < enemiesInWave) {
                spawnTimer = 0;
                spawnEnemy();
                enemiesSpawnedInCurrentWave++;
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                const d = dist(e, player);
                
                // Movement
                let move = true;
                if (e.type === 'ranged' && d < e.range) move = false;

                if (move) {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    const vx = Math.cos(angle) * e.speed * delta;
                    const vy = Math.sin(angle) * e.speed * delta;

                    e.x += vx;
                    for (const obs of obstacles) {
                        if (circleRectCollide(e.x, e.y, e.r, obs.x, obs.y, obs.w, obs.h)) {
                            e.x -= vx;
                            break;
                        }
                    }

                    e.y += vy;
                    for (const obs of obstacles) {
                        if (circleRectCollide(e.x, e.y, e.r, obs.x, obs.y, obs.w, obs.h)) {
                            e.y -= vy;
                            break;
                        }
                    }
                }

                // Behavior
                if (e.type === 'exploder') {
                    if (d < e.range) {
                        // Explode
                        createHitEffect(e.x, e.y); // Explosion visual
                        // Damage player
                        if (d < e.range + player.r) {
                            player.health -= 15;
                            if (player.health <= 0) gameOver();
                            updateUI();
                        }
                        // Kill enemy
                        enemies.splice(i, 1);
                        enemiesDefeated++;
                        addXP(e.score || 20);
                        checkWaveComplete();
                        continue;
                    }
                } else if (e.type === 'ranged') {
                    const now = performance.now();
                    if (now - e.lastAttack > e.cooldown) {
                        e.lastAttack = now;
                        // Shoot
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        enemyBullets.push({
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(angle) * 400,
                            vy: Math.sin(angle) * 400,
                            r: 6,
                            dmg: 10,
                            life: 2000,
                            color: e.color
                        });
                    }
                }

                // Player collision
                if (dist(e, player) < e.r + player.r) {
                    player.health -= 10 * delta; 
                    if (player.health <= 0) {
                        gameOver();
                    }
                    updateUI();
                }
            }
            
            // Shockwaves
            updateShockWaves(delta);
            
            // Loot pickup
            pickupNearbyLoot();

            
        }

        function spawnEnemy() {
            // Spawn at edge
            let ex, ey;
            let attempts = 0;
            let validPosition = false;
            
            while (!validPosition && attempts < 10) {
                attempts++;
                if (Math.random() < 0.5) {
                    ex = Math.random() < 0.5 ? -20 : width + 20;
                    ey = Math.random() * height;
                } else {
                    ex = Math.random() * width;
                    ey = Math.random() < 0.5 ? -20 : height + 20;
                }
                
                // Check collision with obstacles
                let hitObstacle = false;
                // Use a default size for checking (roughly standard enemy size)
                const checkR = 20; 
                for (const obs of obstacles) {
                    if (circleRectCollide(ex, ey, checkR, obs.x, obs.y, obs.w, obs.h)) {
                        hitObstacle = true;
                        break;
                    }
                }
                
                if (!hitObstacle) validPosition = true;
            }
            
            // If still invalid after attempts, just use center-ish but off-screen
            if (!validPosition) {
                ex = -50; ey = -50;
            }

            // Determine Enemy Type based on Wave
            let type = ENEMY_TYPES.STANDARD;
            const randType = Math.random();

            if (wave >= 5 && randType < 0.2) {
                type = ENEMY_TYPES.RANGED;
            } else if (wave >= 3 && randType < 0.4) {
                type = ENEMY_TYPES.TANK;
            } else if (wave >= 2 && randType < 0.6) {
                type = ENEMY_TYPES.EXPLODER;
            }

            // Scaling
            const hpScale = 1 + (wave * 0.1);
            const speedScale = 1 + (wave * 0.02);

            enemies.push({
                x: ex,
                y: ey,
                ...type,
                speed: type.speed * speedScale,
                hp: type.hp * hpScale,
                maxHp: type.hp * hpScale,
                type: type === ENEMY_TYPES.RANGED ? 'ranged' : 
                      type === ENEMY_TYPES.EXPLODER ? 'exploder' : 
                      type === ENEMY_TYPES.TANK ? 'tank' : 'standard',
                lastAttack: 0
            });
        }

        function draw() {
            // Clear background
            ctx.clearRect(0, 0, width, height);

            // Draw Obstacles
            obstacles.forEach(obs => {
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
            });

            // Draw Grid (optional visual)
            ctx.strokeStyle = "rgba(0, 243, 255, 0.05)";
            ctx.lineWidth = 1;
            for(let x=0; x<width; x+=50) {
                ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
            }
            for(let y=0; y<height; y+=50) {
                ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
            }

            // Draw Ground Loot
            groundLoot.forEach(item => {
                ctx.fillStyle = "#fbbf24";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText("?", item.x - 3, item.y + 3);
            });
            
            healthItems.forEach(item => {
                ctx.fillStyle = "#2dd4bf";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText("+", item.x - 3, item.y + 3);
            });
            
            coinsList.forEach(item => {
                ctx.fillStyle = "#f59e0b";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Player
            ctx.save();
            ctx.translate(player.x, player.y);
            const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            ctx.rotate(angle);
            
            // Body
            ctx.fillStyle = "#00f3ff";
            ctx.beginPath();
            ctx.arc(0, 0, player.r, 0, Math.PI * 2);
            ctx.fill();
            
            // Weapon Rendering
            const weapon = inventory[selectedSlot];
            
            if (weapon && weapon.type === "melee") {
                // Draw Sword/Knife
                ctx.save();
                let swingOffset = 0;
                if (player.swinging) {
                    // Swing from -45 to +45 degrees
                    const swingArc = Math.PI / 2; // 90 degrees
                    swingOffset = -swingArc / 2 + player.swingProgress * swingArc;
                }
                ctx.rotate(swingOffset);
                
                // Blade
                ctx.fillStyle = "#e2e8f0";
                ctx.beginPath();
                ctx.moveTo(10, -2);
                ctx.lineTo(40, -2);
                ctx.lineTo(45, 0);
                ctx.lineTo(40, 2);
                ctx.lineTo(10, 2);
                ctx.fill();
                
                // Handle
                ctx.fillStyle = "#4a5568";
                ctx.fillRect(0, -3, 10, 6);
                
                // Swing trail
                if (player.swinging) {
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 45, -0.2, 0.2);
                    ctx.stroke();
                }
                
                ctx.restore();
            } else if (weapon && weapon.type === "gun") {
                // Draw Gun
                ctx.fillStyle = "#333";
                ctx.fillRect(0, -5, 30, 10);
                ctx.fillStyle = "#666";
                ctx.fillRect(5, -5, 5, 10); // Detail
            } else {
                // Default hands
                ctx.fillStyle = "#333";
                ctx.fillRect(0, -5, 10, 10);
            }
            
            ctx.restore();
            
            // Draw Muzzle Flashes
            muzzleFlashes.forEach(flash => {
                ctx.beginPath();
                ctx.arc(flash.x, flash.y, rand(5, 12), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 0, ${rand(0.5, 1)})`;
                ctx.fill();
            });
            
            // Draw Shockwaves
            drawShockWaves();

            // Draw Enemy Bullets
            enemyBullets.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = b.color || "#fff";
                ctx.fill();
            });

            // Draw Enemies
            enemies.forEach(e => {
                ctx.fillStyle = e.color || "#ff0055";
                
                // Shape based on type
                if (e.type === 'ranged') {
                    // Triangle
                    ctx.beginPath();
                    ctx.moveTo(e.x + e.r, e.y);
                    ctx.lineTo(e.x - e.r, e.y + e.r);
                    ctx.lineTo(e.x - e.r, e.y - e.r);
                    ctx.fill();
                } else if (e.type === 'tank') {
                    // Square-ish circle or just bigger
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "#000";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (e.type === 'exploder') {
                    // Pulsing?
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Enemy HP bar
                const hpPct = e.hp / e.maxHp;
                ctx.fillStyle = "red";
                ctx.fillRect(e.x - 15, e.y - 25, 30, 4);
                ctx.fillStyle = "#0f0";
                ctx.fillRect(e.x - 15, e.y - 25, 30 * hpPct, 4);
            });

            // Draw Bullets
            bullets.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = "#fff";
                ctx.fill();
                // Trail
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        function loop() {
            if (!running) return;
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            update(delta);
            draw();

            requestAnimationFrame(loop);
        }
        
        function updateUI() {
            scoreValueEl.textContent = score;
            coinsValueEl.textContent = coins;
            
            // Health
            const healthPct = Math.max(0, (player.health / player.maxHealth) * 100);
            healthBar.style.width = `${healthPct}%`;
            
            if (healthPct < 50) {
                healthBar.classList.add('health-critical');
            } else {
                healthBar.classList.remove('health-critical');
            }
            healthTextEl.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
            
            // Ultimate
            if (player.ultimateReady) {
                ultimateBar.style.width = "100%";
                ultimateTextEl.textContent = "READY";
                ultimateTextEl.style.color = "var(--secondary-color)";
            } else {
                const cooldownPct = 100 - (player.ultimateCooldown / player.ultimateMaxCooldown * 100);
                ultimateBar.style.width = `${cooldownPct}%`;
                ultimateTextEl.textContent = `${Math.ceil(player.ultimateCooldown / 1000)}s`;
                ultimateTextEl.style.color = "var(--text-dim)";
            }
            
            // Ammo
            const weapon = inventory[selectedSlot];
            if (weapon) {
                if (weapon.type === "melee") {
                    ammoValueEl.textContent = "∞";
                } else {
                    ammoValueEl.textContent = `${weapon.ammo} / ${weapon.reserve}`;
                    if (weapon.reloading) {
                        ammoValueEl.textContent = "RELOADING...";
                    }
                }
            } else {
                ammoValueEl.textContent = "-";
            }
            
            // Stats
            waveNumEl.textContent = wave;
            enemyCountEl.textContent = enemies.length;
            
            updateHotbarUI();
            updateHotbarUI();
            
            // Update XP UI
            const xpPct = Math.min(100, (xp / xpToNextLevel) * 100);
            xpBarFill.style.width = `${xpPct}%`;
            levelBadge.textContent = level;
        }
        
        function addXP(amount) {
            xp += amount;
            if (xp >= xpToNextLevel) {
                level++;
                xp -= xpToNextLevel;
                xpToNextLevel = Math.floor(xpToNextLevel * 1.2);
                
                // Show Notification
                levelUpNotification.querySelector('.level-up-desc').textContent = `REACHED LEVEL ${level}`;
                levelUpNotification.classList.remove('hidden');
                setTimeout(() => {
                    levelUpNotification.classList.add('hidden');
                }, 3000);
                
                // Visual fanfare could go here
                createScorePopup(player.x, player.y - 50, "LEVEL UP!");
            }
            updateUI();
        }

        function gameOver() {
            running = false;
            gameOverEl.classList.remove("hidden");
            finalScoreEl.textContent = score;
            finalCoinsEl.textContent = coins;
        }