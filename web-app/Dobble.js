import R from "./ramda.js";
/**
 * Dobble.js is a module to model and play "Dobble" (also "Spot It!"),
 * a fast-paced game in which any two cards share exactly one symbol and
 * players race to spot it.
 * https://en.wikipedia.org/wiki/Dobble
 * @namespace Dobble
 * @author Vaishnavi Garlapalli
 * @version 2025/26
 */
const Dobble = Object.create(null);

/**
 * A symbol is a single icon printed on a card,
 * represented as a number that indexes into a list of symbol images.
 * @memberof Dobble
 * @typedef {number} Symbol
 */

/**
 * A card is the collection of symbols printed on it.
 * Any two cards share exactly one symbol.
 * @memberof Dobble
 * @typedef {Dobble.Symbol[]} Card
 */

/**
 * A deck is the full set of cards used for a game.
 * @memberof Dobble
 * @typedef {Dobble.Card[]} Deck
 */

/**
 * A player, either player 1 or player 2.
 * @memberof Dobble
 * @typedef {(1 | 2)} Player
 */

/**
 * The result of a finished game: the winning player, or `0` for a draw.
 * @memberof Dobble
 * @typedef {(0 | 1 | 2)} Result
 */

/**
 * A game holds the deck in play and the record of round winners,
 * from which the scores, the current round, and the cards on show
 * are all derived.
 * @memberof Dobble
 * @typedef {Object} Game
 * @property {Dobble.Deck} deck The deck of cards in use for this game.
 * @property {Dobble.Player[]} results The winner of each completed round,
 *     in order. Its length is the number of rounds played so far.
 */

// Order of the projective plane the deck is built from. Must be prime.
// The number of symbols (and so images) required is order * order + order + 1.
const order = 3;
const symbols_per_card = order + 1;
const cards_per_round = 2; // One card is dealt to each of the two players.

/**
 * The number of rounds in a complete game.
 * The game ends once this many rounds have been won.
 * @memberof Dobble
 * @constant {number}
 */
Dobble.rounds_to_play = 16;

const grid_symbol = (row, column) => symbols_per_card + order * row + column;

/**
 * Builds a deck in which every pair of cards shares exactly one symbol.
 * The cards are returned in a fixed order; shuffle the deck before play
 * for a different game each time.
 * @memberof Dobble
 * @function
 * @returns {Dobble.Deck} A complete deck of (order * order + order + 1) cards.
 */
Dobble.deck = function () {
    // The deck is a finite projective plane of the given order. The first
    // few symbols (0 to order) are shared "anchor" symbols; the remaining
    // symbols fill an order-by-order grid. Every card after the first is one
    // straight line through that grid, so any two cards meet in one symbol.
    const header_card = R.range(0, symbols_per_card);
    const cards_through_first_symbol = R.range(0, order).map(
        (row) => [
            0,
            ...R.range(0, order).map((column) => grid_symbol(row, column))
        ]
    );
    const cards_through_other_symbols = R.range(0, order).flatMap(
        (slope) => R.range(0, order).map(
            (intercept) => [
                slope + 1,
                ...R.range(0, order).map(
                    (row) => grid_symbol(row, (slope * row + intercept) % order)
                )
            ]
        )
    );
    return [
        header_card,
        ...cards_through_first_symbol,
        ...cards_through_other_symbols
    ];
};

/**
 * Starts a new game with no rounds yet played.
 * @memberof Dobble
 * @function
 * @param {Dobble.Deck} [deck = Dobble.deck()] The deck to play with.
 *     Pass a shuffled deck for a different game each time.
 * @returns {Dobble.Game} A new game ready for its first round.
 */
Dobble.new_game = function (deck = Dobble.deck()) {
    return {
        "deck": deck,
        "results": []
    };
};

/**
 * Returns the cards on show this round, one for each player.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to read.
 * @returns {Dobble.Card[]} The pair of cards as [player 1's, player 2's].
 */
Dobble.current_cards = function (game) {
    const round = game.results.length;
    const deck_size = game.deck.length;
    const first_card_index = cards_per_round * round;
    return R.range(0, cards_per_round).map(
        (offset) => game.deck[(first_card_index + offset) % deck_size]
    );
};

/**
 * Returns the single symbol shared by the two cards on show.
 * This is the symbol a player must select to win the round.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to read.
 * @returns {Dobble.Symbol} The shared symbol of the current pair of cards.
 */
Dobble.matching_symbol = function (game) {
    const [first_card, second_card] = Dobble.current_cards(game);
    return R.head(R.intersection(first_card, second_card));
};

/**
 * Records a player selecting a symbol on their card.
 * If the symbol is the shared match and the game is still in progress,
 * that player wins the round and the next round begins;
 * otherwise nothing changes.
 * @memberof Dobble
 * @function
 * @param {Dobble.Player} player The player making the selection.
 * @param {Dobble.Symbol} symbol The symbol the player selected.
 * @param {Dobble.Game} game The game the selection is made in.
 * @returns {(Dobble.Game | undefined)} The game after the round is won,
 *     or `undefined` if the selection was wrong or the game had ended.
 */
Dobble.select_symbol = function (player, symbol, game) {
    if (Dobble.is_ended(game)) {
        return undefined;
    }
    if (symbol !== Dobble.matching_symbol(game)) {
        return undefined;
    }
    return {
        "deck": game.deck,
        "results": [...game.results, player]
    };
};

/**
 * Returns a player's score, i.e. the number of rounds they have won.
 * @memberof Dobble
 * @function
 * @param {Dobble.Player} player The player whose score to count.
 * @param {Dobble.Game} game The game to read.
 * @returns {number} How many rounds the player has won.
 */
Dobble.score = function (player, game) {
    return R.count(R.equals(player), game.results);
};

/**
 * Returns how many rounds have been completed.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to read.
 * @returns {number} The number of rounds played so far.
 */
Dobble.rounds_played = function (game) {
    return game.results.length;
};

/**
 * Returns whether the game has finished,
 * i.e. every round has been played.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to test.
 * @returns {boolean} Whether the game has ended.
 */
Dobble.is_ended = function (game) {
    return game.results.length >= Dobble.rounds_to_play;
};

/**
 * Returns the result of a finished game.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to read.
 * @returns {(Dobble.Result | undefined)} The winning player, `0` for a draw,
 *     or `undefined` if the game has not yet ended.
 */
Dobble.winner = function (game) {
    if (!Dobble.is_ended(game)) {
        return undefined;
    }
    const player_1_score = Dobble.score(1, game);
    const player_2_score = Dobble.score(2, game);
    if (player_1_score === player_2_score) {
        return 0;
    }
    if (player_1_score > player_2_score) {
        return 1;
    }
    return 2;
};

/**
 * Returns a function that renders the cards on show as text,
 * mapping each symbol to a provided string. Useful in the debug console.
 * @memberof Dobble
 * @function
 * @param {string[]} symbol_strings Strings to display each symbol as,
 *     indexed by symbol.
 * @returns {function} A function from a game to its string representation.
 */
Dobble.to_string_with_symbols = (symbol_strings) => (game) => R.pipe(
    Dobble.current_cards,
    R.map(R.map((symbol) => symbol_strings[symbol] || symbol)),
    R.map(R.join(" ")),
    R.join("\n")
)(game);

/**
 * Returns a string representation of the cards on show,
 * displaying each symbol by its number. For printing to the console.
 * @memberof Dobble
 * @function
 * @param {Dobble.Game} game The game to represent.
 * @returns {string} The string representation of the cards on show.
 */
Dobble.to_string = Dobble.to_string_with_symbols([]);

export default Object.freeze(Dobble);