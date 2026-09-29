import { EventTarget } from 'cc';

/** X-координаты линий трассы: L, C, R. */
export const LANES: readonly number[] = [-1.5, 0, 1.5];

/** Размер блока (ребро куба) в мировых единицах. */
export const BLOCK_SIZE = 0.5;

/** Минимум блоков на финише для победы. */
export const MIN_BLOCKS_TO_WIN = 3;

export enum GameState {
    Tutorial,
    Run,
    Finish,
    Result,
    EndCard,
}

export const GameEvent = {
    /** (state: GameState) */
    STATE_CHANGED: 'state-changed',
    /** (count: number, delta: number) */
    STACK_CHANGED: 'stack-changed',
    /** (placed: number, total: number, slotWorldPos?: Vec3) */
    BLOCK_PLACED: 'block-placed',
    /** (win: boolean) */
    RESULT: 'result',
    /** () */
    PLAYER_HIT: 'player-hit',
    /** (lane: number) — игрок сменил линию */
    LANE_CHANGED: 'lane-changed',
};

/** Глобальная шина событий игры. */
export const gameEvents = new EventTarget();

export function laneFromX(x: number): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < LANES.length; i++) {
        const d = Math.abs(LANES[i] - x);
        if (d < bestD) { bestD = d; best = i; }
    }
    return best;
}
