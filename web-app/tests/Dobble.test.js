import Dobble from "../Dobble.js";
import R from "../ramda.js";

const display = function (game) {
    return "\n" + Dobble.to_string(game);
};

/**
 * Throws unless two cards share exactly one symbol.
 * @memberof Dobble.test
 * @function
 * @param {Dobble.Card} card_a The first card to compare.
 * @param {Dobble.Card} card_b The second card to compare.
 * @throws If the two cards share zero, or more than one, symbol.
 */
const throw_if_not_one_shared_symbol = function (card_a, card_b) {
    const shared_symbols = R.intersection(card_a, card_b);
    if (shared_symbols.length !== 1) {
        throw new Error(
            "Two cards should share exactly one symbol, but these share " +
            shared_symbols.length + ":\n" +
            JSON.stringify(card_a) + "\n" +
            JSON.stringify(card_b)
        );
    }
};

/**
 * Plays a sequence of rounds, each won by the given player, by selecting
 * the matching symbol on their behalf.
 * @memberof Dobble.test
 * @function
 * @param {Dobble.Player[]} round_winners The player to win each round, in order.
 * @param {Dobble.Game} starting_game The game to play on.
 * @returns {Dobble.Game} The game after the rounds have been played.
 */
const play = function (round_winners, starting_game) {
    return R.reduce(
        (game, winner) => Dobble.select_symbol(
            winner,
            Dobble.matching_symbol(game),
            game
        ),
        starting_game,
        round_winners
    );
};

describe("Deck", function () {
    it("Any two cards in the deck share exactly one symbol.", function () {
        const deck = Dobble.deck();
        deck.forEach(function (card_a, index) {
            deck.slice(index + 1).forEach(function (card_b) {
                throw_if_not_one_shared_symbol(card_a, card_b);
            });
        });
    });

    it("Every card in the deck has the same number of symbols.", function () {
        const deck = Dobble.deck();
        const sizes = R.map(R.length, deck);
        const all_equal = R.all(R.equals(R.head(sizes)), sizes);
        if (!all_equal) {
            throw new Error(
                "All cards should have the same number of symbols, " +
                "but the sizes were: " + JSON.stringify(sizes)
            );
        }
    });
});

describe("A new game", function () {
    it(
        "has no rounds played, a score of zero each, and is not ended.",
        function () {
            const game = Dobble.new_game();
            if (Dobble.rounds_played(game) !== 0) {
                throw new Error(
                    "A new game should have no rounds played, but has " +
                    Dobble.rounds_played(game) + "."
                );
            }
            if (Dobble.score(1, game) !== 0 || Dobble.score(2, game) !== 0) {
                throw new Error(
                    "A new game should have zero scores, but they were " +
                    Dobble.score(1, game) + " and " + Dobble.score(2, game) + "."
                );
            }
            if (Dobble.is_ended(game)) {
                throw new Error("A new game should not be ended.");
            }
        }
    );

    it("has no winner yet.", function () {
        const game = Dobble.new_game();
        if (Dobble.winner(game) !== undefined) {
            throw new Error(
                "A game in progress should have no winner, but it was " +
                Dobble.winner(game) + "."
            );
        }
    });

    it(
        "shows two cards whose one shared symbol is the matching symbol.",
        function () {
            const game = Dobble.new_game();
            const [card_1, card_2] = Dobble.current_cards(game);
            const match = Dobble.matching_symbol(game);
            throw_if_not_one_shared_symbol(card_1, card_2);
            if (!card_1.includes(match) || !card_2.includes(match)) {
                throw new Error(
                    "The matching symbol should appear on both cards." +
                    display(game)
                );
            }
        }
    );
});

describe("Every round of a game", function () {
    it(
        "shows two cards sharing exactly one symbol, until the game ends.",
        function () {
            R.range(0, Dobble.rounds_to_play).reduce(
                function (game) {
                    const [card_1, card_2] = Dobble.current_cards(game);
                    throw_if_not_one_shared_symbol(card_1, card_2);
                    return Dobble.select_symbol(
                        1,
                        Dobble.matching_symbol(game),
                        game
                    );
                },
                Dobble.new_game()
            );
        }
    );
});

describe("Selecting a symbol", function () {
    it(
        `Given a game in progress,
When a player selects the matching symbol,
Then that player wins the round, increasing their score by one
and advancing the game by one round.`,
        function () {
            const game = Dobble.new_game();
            const next_game = Dobble.select_symbol(
                1,
                Dobble.matching_symbol(game),
                game
            );
            if (Dobble.score(1, next_game) !== 1) {
                throw new Error(
                    "The selecting player's score should be 1, but was " +
                    Dobble.score(1, next_game) + "."
                );
            }
            if (Dobble.rounds_played(next_game) !== 1) {
                throw new Error(
                    "One round should have been played, but " +
                    Dobble.rounds_played(next_game) + " were."
                );
            }
        }
    );

    it(
        `Given a game in progress,
When a player selects a symbol that is not the match,
Then no round is played and the selection is rejected.`,
        function () {
            const game = Dobble.new_game();
            const match = Dobble.matching_symbol(game);
            const [card_1] = Dobble.current_cards(game);
            const wrong_symbol = R.head(R.reject(R.equals(match), card_1));
            const result = Dobble.select_symbol(1, wrong_symbol, game);
            if (result !== undefined) {
                throw new Error(
                    "Selecting a non-matching symbol should return undefined, " +
                    "but a game was returned."
                );
            }
        }
    );

    it(
        `Given a game that has ended,
When a player selects the matching symbol,
Then the selection is rejected and no further round is played.`,
        function () {
            const ended_game = play(
                R.repeat(1, Dobble.rounds_to_play),
                Dobble.new_game()
            );
            const result = Dobble.select_symbol(
                1,
                Dobble.matching_symbol(ended_game),
                ended_game
            );
            if (result !== undefined) {
                throw new Error(
                    "Selecting after the game has ended should return " +
                    "undefined, but a game was returned."
                );
            }
        }
    );
});

describe("Finishing a game", function () {
    it(
        "ends after every round, won by the player with the higher score.",
        function () {
            const game = play(
                R.repeat(1, Dobble.rounds_to_play),
                Dobble.new_game()
            );
            if (!Dobble.is_ended(game)) {
                throw new Error("The game should be ended after every round.");
            }
            if (Dobble.winner(game) !== 1) {
                throw new Error(
                    "Player 1 won every round, so should win, but winner was " +
                    Dobble.winner(game) + "."
                );
            }
            if (Dobble.score(1, game) !== Dobble.rounds_to_play) {
                throw new Error("Player 1 should have won every round.");
            }
            if (Dobble.score(2, game) !== 0) {
                throw new Error("Player 2 should have won no rounds.");
            }
        }
    );

    it(
        "is a draw when both players win the same number of rounds.",
        function () {
            const alternating_winners = R.range(
                0,
                Dobble.rounds_to_play
            ).map(
                (round) => (
                    round % 2 === 0
                    ? 1
                    : 2
                )
            );
            const game = play(alternating_winners, Dobble.new_game());
            if (Dobble.winner(game) !== 0) {
                throw new Error(
                    "Equal scores should be a draw (0), but winner was " +
                    Dobble.winner(game) + "."
                );
            }
        }
    );
});