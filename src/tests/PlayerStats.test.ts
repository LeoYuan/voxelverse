import { describe, it, expect } from 'vitest';
import { PlayerStats } from '../player/PlayerStats';

describe('PlayerStats', () => {
  it('should initialize with full health and hunger', () => {
    const stats = new PlayerStats();
    expect(stats.health).toBe(20);
    expect(stats.hunger).toBe(20);
    expect(stats.isDead).toBe(false);
  });

  it('should take damage', () => {
    const stats = new PlayerStats();
    stats.damage(5);
    expect(stats.health).toBe(15);
  });

  it('should die when health reaches 0', () => {
    const stats = new PlayerStats();
    stats.damage(25);
    expect(stats.health).toBe(0);
    expect(stats.isDead).toBe(true);
  });

  it('should not take damage when dead', () => {
    const stats = new PlayerStats();
    stats.damage(25);
    stats.damage(5);
    expect(stats.health).toBe(0);
  });

  it('should have invulnerability frames after damage', () => {
    const stats = new PlayerStats();
    stats.damage(5);
    expect(stats.invulnerableTimer).toBeGreaterThan(0);
    stats.damage(5);
    expect(stats.health).toBe(15); // No damage during invulnerability
  });

  it('should heal up to max health', () => {
    const stats = new PlayerStats();
    stats.damage(10);
    stats.heal(5);
    expect(stats.health).toBe(15);
    stats.heal(10);
    expect(stats.health).toBe(20);
  });

  it('should eat food to restore hunger', () => {
    const stats = new PlayerStats();
    stats.hunger = 10;
    stats.eat(5);
    expect(stats.hunger).toBe(15);
  });

  it('should cap hunger at max', () => {
    const stats = new PlayerStats();
    stats.eat(5);
    expect(stats.hunger).toBe(20);
  });

  it('should drain hunger over time', () => {
    const stats = new PlayerStats();
    stats.update(5); // 5 seconds
    expect(stats.hunger).toBeLessThan(20);
  });

  it('should regenerate health when hunger is full', () => {
    const stats = new PlayerStats();
    stats.damage(5);
    stats.hunger = 18;
    stats.update(1); // 1 second
    expect(stats.health).toBeGreaterThan(15);
  });

  it('should not regenerate health when hunger is low', () => {
    const stats = new PlayerStats();
    stats.damage(5);
    stats.hunger = 10;
    stats.update(1);
    expect(stats.health).toBe(15);
  });

  it('should take starvation damage when hunger is 0', () => {
    const stats = new PlayerStats();
    stats.hunger = 0;
    stats.update(5);
    expect(stats.health).toBeLessThan(20);
  });

  it('should reset to full stats', () => {
    const stats = new PlayerStats();
    stats.damage(10);
    stats.hunger = 5;
    stats.reset();
    expect(stats.health).toBe(20);
    expect(stats.hunger).toBe(20);
    expect(stats.isDead).toBe(false);
  });
});
