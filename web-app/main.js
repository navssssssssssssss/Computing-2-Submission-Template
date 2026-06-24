/*jslint browser */
import R from "./ramda.js";
import Dobble from "./Dobble.js";

// Each symbol id (the array index) maps to an image and an accessible label.
// Replace the paths with the artwork placed in the assets folder.
const symbols = [
    {"image": "./assets/instant_noodles.png", "name": "Instant noodles"},
    {"image": "./assets/energy_drink.png", "name": "Energy drink"},
    {"image": "./assets/empty_wallet.png", "name": "Empty wallet"},
    {"image": "./assets/graduation_cap.png", "name": "Graduation cap"},
    {"image": "./assets/pizza_box.png", "name": "Pizza box"},
    {"image": "./assets/hangover.png", "name": "Hangover"},
    {"image": "./assets/coffee.png", "name": "All-nighter coffee"},
    {"image": "./assets/meal_deal.png", "name": "Meal deal"},
    {"image": "./assets/pint_glass.png", "name": "Pint glass"},
    {"image": "./assets/microwave_meal.png", "name": "Microwave meal"},
    {"image": "./assets/library_book.png", "name": "Library book"},
    {"image": "./assets/alarm_clock.png", "name": "Alarm clock"},
    {"image": "./assets/highlighter.png", "name": "Highlighter"}
];

// Presentation tuning for the scattered card layout.
const centre_percent = 50;
const full_turn_radians = 2 * Math.PI;
const max_tilt_degrees = 50;
const min_scale = 0.6;
const max_scale = 1.35;
// Half a symbol's width as a percentage of the card, used to keep symbols
// inside the card and clear of one another (it tracks --symbol-size over
// --card-size), with a budget of attempts to find a free spot.
const symbol_radius_percent = 10;
const edge_margin_percent = 1;
const spacing_factor = 1;
const max_placement_attempts = 80;

const player_cards = [
    document.getElementById("player_1_card"),
    document.getElementById("player_2_card")
];
const player_scores = [
    document.getElementById("player_1_score"),
    document.getElementById("player_2_score")
];
const round_number = document.getElementById("round_number");
const total_rounds = document.getElementById("total_rounds");
const status_message = document.getElementById("status");
const start_button = document.getElementById("start_button");
const result_dialog = document.getElementById("result_dialog");
const result_message = document.getElementById("result_message");
const play_again_button = document.getElementById("play_again_button");

let game = Dobble.new_game();

const shuffle = (cards) => R.pipe(
    R.map((card) => [Math.random(), card]),
    R.sortBy(R.head),
    R.map(R.last)
)(cards);

const random_between = (low, high) => low + Math.random() * (high - low);

const announce_correct = function (player) {
    status_message.textContent = "Player " + player + " found the match!";
};

const announce_wrong = function (player, button) {
    status_message.textContent = (
        "Player " + player + ": not a match — try again."
    );
    button.classList.add("wrong");
    button.addEventListener(
        "animationend",
        () => button.classList.remove("wrong"),
        {"once": true}
    );
};

const select = function (player, symbol, button) {
    const next_game = Dobble.select_symbol(player, symbol, game);
    if (next_game === undefined) {
        announce_wrong(player, button);
        return;
    }
    game = next_game;
    announce_correct(player);
    update_display();
    if (Dobble.is_ended(game)) {
        show_result();
    }
};

const random_position = function (radius_percent, placed, attempts) {
    const max_distance = centre_percent - radius_percent - edge_margin_percent;
    const distance = max_distance * Math.sqrt(Math.random());
    const angle = Math.random() * full_turn_radians;
    const x = centre_percent + distance * Math.cos(angle);
    const y = centre_percent + distance * Math.sin(angle);
    const clashes = placed.some(function (other) {
        const dx = x - other.x;
        const dy = y - other.y;
        const gap = Math.sqrt(dx * dx + dy * dy);
        return gap < (radius_percent + other.radius) * spacing_factor;
    });
    if (clashes && attempts > 0) {
        return random_position(radius_percent, placed, attempts - 1);
    }
    return {"x": x, "y": y, "radius": radius_percent};
};

// Gives each symbol a random size and a non-overlapping random position.
// The largest symbols are placed first, while there is the most room.
const place_symbols = function (card) {
    const sized_symbols = card.map(function (symbol) {
        return {
            "scale": random_between(min_scale, max_scale),
            "symbol": symbol
        };
    });
    const largest_first = R.sort(
        (first, second) => second.scale - first.scale,
        sized_symbols
    );
    return largest_first.reduce(function (placed, sized_symbol) {
        const radius_percent = symbol_radius_percent * sized_symbol.scale;
        const spot = random_position(
            radius_percent,
            placed,
            max_placement_attempts
        );
        return [
            ...placed,
            {
                "symbol": sized_symbol.symbol,
                "scale": sized_symbol.scale,
                "tilt": random_between(-max_tilt_degrees, max_tilt_degrees),
                "x": spot.x,
                "y": spot.y,
                "radius": radius_percent
            }
        ];
    }, []);
};

const render_card = function (card_element, card, player) {
    card_element.replaceChildren();
    place_symbols(card).forEach(function (placement) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "symbol";
        button.style.left = placement.x + "%";
        button.style.top = placement.y + "%";
        button.style.transform = (
            "translate(-50%, -50%) rotate("
            + placement.tilt
            + "deg) scale("
            + placement.scale
            + ")"
        );
        const image = document.createElement("img");
        image.src = symbols[placement.symbol].image;
        image.alt = symbols[placement.symbol].name;
        image.onerror = function () {
            const label = document.createElement("span");
            label.className = "symbol_label";
            label.textContent = symbols[placement.symbol].name;
            image.replaceWith(label);
        };
        button.append(image);
        button.onclick = () => select(player, placement.symbol, button);
        button.onkeydown = function (event) {
            if (event.key === "ArrowRight" && button.nextElementSibling) {
                button.nextElementSibling.focus();
            }
            if (event.key === "ArrowLeft" && button.previousElementSibling) {
                button.previousElementSibling.focus();
            }
        };
        card_element.append(button);
    });
};

const update_display = function () {
    const cards = Dobble.current_cards(game);
    render_card(player_cards[0], cards[0], 1);
    render_card(player_cards[1], cards[1], 2);
    player_scores[0].textContent = Dobble.score(1, game);
    player_scores[1].textContent = Dobble.score(2, game);
    round_number.textContent = Math.min(
        Dobble.rounds_played(game) + 1,
        Dobble.rounds_to_play
    );
};

const show_result = function () {
    const winner = Dobble.winner(game);
    if (winner === 0) {
        result_message.textContent = (
            "It's a draw — " + Dobble.score(1, game) + " each!"
        );
    } else {
        const other_player = 3 - winner; // 1 becomes 2 and 2 becomes 1.
        result_message.textContent = (
            "Player " + winner + " wins "
            + Dobble.score(winner, game) + " to "
            + Dobble.score(other_player, game) + "!"
        );
    }
    result_dialog.showModal();
};

const start_game = function () {
    game = Dobble.new_game(shuffle(Dobble.deck()));
    start_button.textContent = "Restart Game";
    status_message.textContent = "Spot the one symbol both cards share!";
    update_display();
    player_cards[0].firstElementChild.focus();
};

start_button.onclick = start_game;
play_again_button.onclick = function () {
    result_dialog.close();
    start_game();
};

total_rounds.textContent = Dobble.rounds_to_play;