import { team_elim } from '../../basics/helper.js';
import { logCard } from '../../tools/log.js';
import logger from '../../tools/logger.js';

/**
 * @typedef {import('../ref-sieve.js').default} Game
 * @typedef {import('../../basics/State.js').State} State
 * @typedef {import('../../basics/Card.js').Card} Card
 * @typedef {import('../../basics/Card.js').ActualCard} ActualCard
 * @typedef {import('../../types.js').TurnAction} TurnAction
 * @typedef {import('../../types.js').Connection} Connection
 */

/**
 * Performs relevant updates after someone takes a turn.
 * @param {Game} game
 * @param {TurnAction} action
 */
export function update_turn(game, action) {
	const { common, state } = game;
	const { currentPlayerIndex } = action;
	const otherPlayerIndex = (currentPlayerIndex + 1) % state.numPlayers;

	/** @type {number[]} */
	const to_remove = [];

	for (let i = 0; i < common.waiting_connections.length; i++) {
		const { connections, conn_index, focused_card, inference } = common.waiting_connections[i];
		const { reacting, card: old_card, identities } = connections[conn_index];
		logger.info(`waiting for connecting ${logCard(old_card)} ${old_card.order} as ${identities.map(logCard)} (${state.playerNames[reacting]}) for inference ${logCard(inference)} ${focused_card.order}`);

		// After the turn we were waiting for, the card was played and matches expectation
		if (reacting === otherPlayerIndex &&
			state.hands[reacting].findOrder(old_card.order) === undefined &&
			game.last_actions[reacting].type === 'play'
		) {
			if (!identities.some(identity => game.last_actions[reacting].card.matches(identity))) {
				logger.info('card revealed to not be', identities.map(logCard).join(), 'removing connection as', logCard(inference));

				const focus_thoughts = common.thoughts[focused_card.order];
				focus_thoughts.inferred = focus_thoughts.inferred.subtract(inference);
				to_remove.push(i);
			}
			else {
				logger.info(`waiting card ${identities.length === 1 ? logCard(identities[0]) : '(unknown)'} played`);

				// Advance waiting connection to next card that still exists
				common.waiting_connections[i].conn_index = connections.findIndex((conn, index) =>
					index > conn_index && state.hands[conn.reacting].findOrder(conn.card.order));

				if (common.waiting_connections[i].conn_index === -1)
					to_remove.push(i);
			}
		}
	}

	// Filter out connections that have been removed (or connections to the same card where others have been demonstrated)
	common.waiting_connections = common.waiting_connections.filter((wc, i) => !to_remove.includes(i));

	common.update_hypo_stacks(state);
	common.good_touch_elim(state);
	team_elim(game);
}
