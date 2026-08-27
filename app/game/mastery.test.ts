import { describe, expect, it } from 'vitest';
import { bonusPercent, canUpgrade, classTotal, cumulativeStatCost, deficitFor, emptyLevels, hoursUntilAffordable, isMilestone, remainingPoints, targetDate, totalPlannedCost, unlockedCap, upgradeCost, type Levels } from './mastery';

function totals(w:number,r:number,t:number,s:number): Levels { const x=emptyLevels(); x.warrior.atk=w;x.ranged.atk=r;x.tank.atk=t;x.support.atk=s;return x; }

describe('mastery engine', () => {
  it.each([[0,0,0,0,10],[10,0,0,0,10],[10,10,10,9,10],[10,10,10,10,20],[29,20,20,20,30],[100,100,100,92,100],[100,100,100,100,110]])('calculates cap', (w,r,t,s,cap) => expect(unlockedCap(totals(w,r,t,s))).toBe(cap));
  it('calculates totals independently of stat distribution', () => { const x=emptyLevels();x.warrior.atk=51;x.warrior.skillDamage=49;expect(classTotal(x,'warrior')).toBe(100); });
  it('blocks and unlocks the critical 10-to-11 gate', () => { const x=totals(10,10,10,9);expect(canUpgrade(x,'warrior','atk')).toMatchObject({allowed:false,reason:'mastery-locked'});expect(canUpgrade(x,'support','atk')).toMatchObject({allowed:true});x.support.atk=10;expect(canUpgrade(x,'warrior','atk')).toMatchObject({allowed:true}); });
  it('allows 29 to 30 and blocks 30 to 31', () => { const x=totals(29,20,20,20);expect(canUpgrade(x,'warrior','atk').allowed).toBe(true);x.warrior.atk=30;expect(canUpgrade(x,'warrior','atk').allowed).toBe(false); });
  it('blocks missing level 70 costs', () => { const x=totals(69,69,69,69);expect(canUpgrade(x,'warrior','atk')).toMatchObject({allowed:false,reason:'cost-unavailable'}); });
  it.each([[11,true],[21,true],[31,true],[10,false],[20,false],[1,false]])('detects milestones', (level,expected) => expect(isMilestone(level)).toBe(expected));
  it.each([['atk',10,1],['atk',11,2.1],['hp',20,3],['def',21,4.1],['skillDamage',10,2],['skillDamage',11,4.2],['skillDamage',20,6],['skillDamage',21,8.2]] as const)('calculates bonuses', (stat,level,bonus) => expect(bonusPercent(stat,level)).toBe(bonus));
  it('looks up costs independent of class/stat', () => expect(upgradeCost(31)).toBe(640000));
  it('calculates cumulative cost and exact undo refund', () => { expect(cumulativeStatCost(40,42)).toBe(3280000);expect(cumulativeStatCost(40,41)).toBe(1600000); });
  it('calculates total planned cost', () => { const i=emptyLevels(),p=emptyLevels();i.warrior.atk=p.warrior.atk=40;p.warrior.atk=42;expect(totalPlannedCost(i,p)).toBe(3280000); });
  it('allows negative GP and calculates deficit', () => { const remaining=remainingPoints(1000000,1600000);expect(remaining).toBe(-600000);expect(deficitFor(remaining)).toBe(600000); });
  it('handles zero income', () => expect(hoursUntilAffordable(600000,0)).toBeNull());
  it('calculates hours and target date', () => { expect(hoursUntilAffordable(600000,10000)).toBe(60);const now=new Date('2026-08-27T10:00:00Z');expect(targetDate(now,600000,10000)?.toISOString()).toBe('2026-08-29T22:00:00.000Z'); });
});
