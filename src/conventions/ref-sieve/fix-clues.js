import { get_result } from './action-helper.js';
import * as Utils from '../../tools/util.js';

import logger from '../../tools/logger.js';
import { logCard, logClue } from '../../tools/log.js';

/**
 * @typedef {import('../ref-sieve.js').default} Game
 * @typedef {import('../../types.js').Clue} Clue
 */

/**
 * @param {Game} game
 */
export function find_fix_clue(game) {
	const { common, state } = game;
	const partner = (state.ourPlayerIndex + 1) % state.numPlayers;
	const fix_needed = common.thinksPlayables(state, partner).filter(c => !state.isPlayable(c));

	if (fix_needed.length === 0) {
		logger.info('no fix needed');
		return;
	}

	logger.info(`fix needed on [${fix_needed.map(logCard)}]`);

	const best_clue = Utils.maxOn(state.allValidClues(partner), clue => {
		const { hypo_game, value } = get_result(game, clue);
		const fixed = fix_needed.some(c => {
			const actual = hypo_game.state.hands[partner].findOrder(c.order);
			const card = hypo_game.common.thoughts[c.order];
			return card.inferred.has(actual) || card.inferred.length === 0 || card.reset;
		});

		if (fixed)
			logger.info('clue', logClue(clue), 'fixes with value', value);

		return fixed ? value : -9999;
	}, -9999);

	if (best_clue === undefined)
		logger.warn('Unable to find fix clue!');

	return best_clue;
}
