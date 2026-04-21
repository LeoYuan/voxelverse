export class PlayerStats {
  public maxHealth = 20;
  public health = 20;
  public maxHunger = 20;
  public hunger = 20;

  public isDead = false;

  // Hunger drains every this many seconds
  private hungerDrainInterval = 4;
  private hungerDrainTimer = 0;

  // Health regen when hunger >= 18 (saturation)
  private regenInterval = 0.5;
  private regenTimer = 0;

  // Starvation damage when hunger is 0
  private starvationInterval = 4;
  private starvationTimer = 0;

  // Invulnerability frames after taking damage
  public invulnerableTimer = 0;

  damage(amount: number) {
    if (this.isDead || this.invulnerableTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.5;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  heal(amount: number) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  eat(foodPoints: number, _saturationBonus = 0) {
    if (this.isDead) return;
    this.hunger = Math.min(this.maxHunger, this.hunger + foodPoints);
  }

  update(dt: number) {
    if (this.isDead) return;

    // Update invulnerability
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Hunger drain
    this.hungerDrainTimer += dt;
    if (this.hungerDrainTimer >= this.hungerDrainInterval) {
      this.hungerDrainTimer -= this.hungerDrainInterval;
      if (this.hunger > 0) {
        this.hunger = Math.max(0, this.hunger - 1);
      }
    }

    // Health regeneration when hunger is full (>= 18)
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer >= this.regenInterval) {
        this.regenTimer -= this.regenInterval;
        this.heal(1);
      }
    } else {
      this.regenTimer = 0;
    }

    // Starvation damage when hunger is 0
    if (this.hunger <= 0) {
      this.starvationTimer += dt;
      if (this.starvationTimer >= this.starvationInterval) {
        this.starvationTimer -= this.starvationInterval;
        this.damage(1);
      }
    } else {
      this.starvationTimer = 0;
    }
  }

  reset() {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.isDead = false;
    this.invulnerableTimer = 0;
    this.hungerDrainTimer = 0;
    this.regenTimer = 0;
    this.starvationTimer = 0;
  }
}
