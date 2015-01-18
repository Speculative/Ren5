var IMG_EXTS = ["png", "jpg", "jpeg", "bmp", "svg"];
var BGM_EXTS = ["mp3", "wav"];

/*
 * ===================
 * ASSET LOADING STUFF
 * ===================
 */

function AssetStore(requirements, completion_event) {
	this.requirements = requirements;
	this.progress = 0;
	this.progress_target = this.total_assets();
	this.completion_event = completion_event;
	this.load_assets();
}

AssetStore.prototype.load_assets = function() {
	var store = this;
	for (var category in this.requirements) {
		this[category] = {};
		for (var asset of this.requirements[category]) {
			var asset_path = "assets/" + category + "/" + asset;
			this[category][asset] = new Asset(asset, asset_path,
				function() {
					store.progress += 1;
					console.log(store.progress / store.progress_target);
					if (store.progress == store.progress_target) {
						document.dispatchEvent(store.completion_event);
				}
			});
		}
	}
}

AssetStore.prototype.total_assets = function() {
	var total = 0;
	for (category in this.requirements) {
		for (asset of this.requirements[category]) {
			total += 1;
		}
	}
	return total;
}

AssetStore.prototype.get_progress = function() {
	return this.progress;
}

AssetStore.prototype.get_progress_target = function() {
	return this.progress_target;
}

function Asset(alias, path, done_callback) {
	this.alias = alias;
	this.path = path;
	this.done_callback = done_callback;
	this.asset = null;
	this.load_asset();
}

Asset.prototype.load_asset = function() {
	var ext = this.path.split(".").pop();
	if (IMG_EXTS.indexOf(ext) !== -1) {
		this.asset = new Image();
		this.asset.onload = this.done_callback;
		this.asset.src = this.path;
	} else if (BGM_EXTS.indexOf(ext) !== -1) {
		this.asset = new Audio();
		this.asset.addEventListener("canplaythrough", this.done_callback);
		this.asset.src = this.path;
	} else {
		return null;
	}
}

Asset.prototype.get = function() {
	return this.asset;
}

/*
 * ===========
 * SCENE STUFF
 * ===========
 */

/*
 * Handles all drawing and music playing
 */
function Scene(backdrop_context, character_context, ui_context, assets, ui_controller) {
	this.backdrop_context = backdrop_context;
	this.character_context = character_context;
	this.ui_context = ui_context;
	this.assets = assets;
	this.ui_controller = ui_controller;

	this.characters = [];
	this.backdrop = null;
	this.active = null;

	this.positions = {
		LEFT: {
			x: 0.2,
			y: 0.5
		},
		RIGHT: {
			x: .8,
			y: 0.5
		}
	};
}

Scene.prototype.render = function() {
	if (this.backdrop !== null) {
		this.draw_backdrop(this.backdrop);
	}
	for (character of this.characters) {
		this.draw_character(character.name, character.position);
	}
	this.render_ui();
}

/*
 * Must be called after finished constructing UIController
 */
Scene.prototype.register_ui_handlers = function() {
	var scene = this;
	document.addEventListener("ren5-nohover", function() {
		scene.no_hover_handler();
	});
	document.addEventListener("ren5-hover", function(e) {
		scene.hover_handler(e.detail.element);
	});
	document.addEventListener("ren5-click", function(e) {
		scene.click_handler(e.detail.element);
	});
}

Scene.prototype.no_hover_handler = function() {
	this.undo_hover();
}

Scene.prototype.hover_handler = function(ui_element) {
	this.undo_hover();
	this.active = this.ui_controller.active;
	this.render_ui_element(ui_element, true);
}

Scene.prototype.undo_hover = function() {
	if (this.active !== null && this.default_render !== null) {
		var dirty_element = this.active;
		console.log("Un-hovering " + dirty_element.asset.alias);
		/*
		this.ui_context.putImageData(this.default_render,
				dirty_element.position.x, dirty_element.position.y,
				dirty_element.position.x, dirty_element.position.y,
				dirty_element.size.width, dirty_element.size.height);
		*/
	}
}

Scene.prototype.click_handler = function(ui_element) {
	console.log("Click callback on " + ui_element.asset.alias);
}

Scene.prototype.set_backdrop = function(backdrop_name) {
	this.backdrop = backdrop_name;
}

Scene.prototype.draw_backdrop = function(backdrop_name) {
	var backdrop = this.assets["backdrops"][backdrop_name].get();
	var draw_height = this.backdrop_context.canvas.clientHeight;
	var draw_width = this.backdrop_context.canvas.clientWidth;

	this.backdrop_context.fillStyle = "#FFFFFF";
	this.backdrop_context.clearRect(0, 0, draw_height, draw_width);

	this.backdrop_context.drawImage(backdrop,
			0, 0,
			draw_width, draw_height);
}

/*
 * position is given as a fraction of the screen size with x increasing left
 * to right and y increasing top to bottom. x,y corresponds to the center of
 * the character.
 */
Scene.prototype.draw_character = function(character_name, position) {
	var character = this.assets["characters"][character_name].get();
	var aspect_ratio = character.width / character.height;
	var draw_height = this.character_context.canvas.clientHeight;
	var draw_width = aspect_ratio * draw_height;

	if (typeof(position) === "undefined") {
		position = this.positions["LEFT"];
	}

	var absolute_x = (position.x * this.character_context.canvas.clientWidth) - draw_width / 2;
	var absolute_y = (position.y * this.character_context.canvas.clientHeight) - draw_height / 2;

	this.character_context.drawImage(character,
			absolute_x, absolute_y,
			draw_width, draw_height);
}

function Character(name, position) {
	this.name = name;
	this.position = position;
}

Scene.prototype.add_character = function(character) {
	this.characters.push(character);
}

Scene.prototype.play_bgm = function(bgm_name) {
	// Note to future Jeff: setting sound.currentTime (sometimes) fires the
	// canplaythrough event which will probably do weird things to the
	// loading progress. That probably does something bad.
	var sound = this.assets["bgm"][bgm_name].get();

	sound.currentTime = 0;
	sound.play();
}

Scene.prototype.render_ui = function() {
	for (ui_element in this.ui_controller.elements) {
		this.render_ui_element(this.ui_controller.elements[ui_element]);
	}
}

Scene.prototype.render_ui_element = function(ui_element, active) {
	if (typeof(active) === "undefined") {
		active = false;
	}

	var asset = null;

	if (active) {
		asset = ui_element.hover_asset.get();
	} else {
		asset = ui_element.asset.get();
	}
		this.ui_context.drawImage(asset,
				ui_element.position.x, ui_element.position.y,
				ui_element.size.width, ui_element.size.height);
}

/*
 * ========
 * UI STUFF
 * ========
 */

function UIController() {
	this.elements = [];
	this.click_events = {};
	this.hover_events = {};
	this.active = null;
}

UIController.prototype.add_element = function(ui_element) {
	console.log("adding element " + ui_element.asset.alias);
	this.elements.push(ui_element);
	this.click_events[ui_element.asset.alias] = new CustomEvent("ren5-click", {detail: {element: ui_element}});
	this.hover_events[ui_element.asset.alias] = new CustomEvent("ren5-hover", {detail: {element: ui_element}});
}

UIController.prototype.load_elements = function() {
	return;
}

UIController.prototype.get_mouse_coords = function(e) {
	var canvas = document.getElementById("ren5-ui");
	var x = 0;
	var y = 0;

	var rect = canvas.getBoundingClientRect();
	x = e.clientX - rect.left;
	y = e.clientY - rect.top;
	return {"x": x, "y": y};
}

UIController.prototype.handle_click = function(e) {
	if (this.active) {
		document.dispatchEvent(this.click_events[this.active.asset.alias]);
	}
}

UIController.prototype.handle_move = function(e) {
	if (this.active && this.active.in_bounds(this.get_mouse_coords(e)))
		return;

	this.active = null;

	for (ui_element of this.elements) {
		if (ui_element.interactable && ui_element.in_bounds(this.get_mouse_coords(e))) {
			this.active = ui_element;
		}
	}

	if (this.active !== null) {
		document.dispatchEvent(this.hover_events[this.active.asset.alias]);
	} else {
		document.dispatchEvent(new Event("ren5-nohover"));
	}
}

/*
 * Expects absolute position and size
 */
function UIElement(asset, position, size, interactable, hover_asset) {
	if (typeof(interactable) !== "undefined") {
		this.interactable = interactable;
	} else {
		this.interactable = true;
	}
	this.asset = asset;
	this.position = position;
	this.size = size;
	if (typeof(hover_asset !== "undefined")) {
		this.hover_asset = hover_asset;
	} else {
		this.hover_asset = this.asset;
	}
}

UIElement.prototype.in_bounds = function(position) {
	var left_x = this.position.x;
	var right_x = this.position.x + this.size.width;
	var top_y = this.position.y;
	var bottom_y = this.position.y + this.size.height;
	console.log(left_x + " " + right_x + " " + top_y + " " + bottom_y);
	console.log(position.x + " " + position.y);
	return (position.x >= left_x) && (position.x <= right_x) && (position.y >= top_y) && (position.y <= bottom_y);
}

/*
 * =========
 * MAIN LOOP
 * =========
 */

function requirements() {
	return {backdrops: ["had_background.svg"],
		characters: ["had_junko.svg", "had_pko.svg"],
		bgm: ["morejo.mp3"],
		ui: ["dialogue.svg",
		"bottom_config.svg", "bottom_load.svg", "bottom_save.svg", "bottom_menu.svg",
		"dialogue_auto.svg", "dialogue_log.svg", "dialogue_scene.svg", "dialogue_skip.svg",
		"bottom_config_hover.svg", "bottom_load_hover.svg", "bottom_save_hover.svg", "bottom_menu_hover.svg",
		"dialogue_auto_hover.svg", "dialogue_log_hover.svg", "dialogue_scene_hover.svg", "dialogue_skip_hover.svg"]};
}

function setup() {
	var load_complete = new Event("load_complete");
	var assets = null;
	document.addEventListener("load_complete", function() {
		run(assets)
	});
	assets = new AssetStore(requirements(), load_complete);
}

function run(assets) {
	console.log("Done loading... running");
	var backdrop_canvas = document.getElementById("ren5-backdrop");
	var character_canvas = document.getElementById("ren5-character");
	var ui_canvas = document.getElementById("ren5-ui");
	var backdrop_context = backdrop_canvas.getContext("2d");
	var character_context = character_canvas.getContext("2d");
	var ui_context = ui_canvas.getContext("2d");

	var controller = new UIController();
	var scene = new Scene(backdrop_context, character_context, ui_context, assets, controller);
	console.log("made scene");

	ui_canvas.addEventListener("mouseup", function(e) {
		controller.handle_click(e);
	});

	ui_canvas.addEventListener("mousemove", function(e) {
		e.stopPropagation();
		controller.handle_move(e);
	});

	// Only for proof of concept purposes
	var dialogue_asset = assets["ui"]["dialogue.svg"].get();
	var aspect_ratio = dialogue_asset.width / dialogue_asset.height;
	controller.add_element(new UIElement(assets["ui"]["dialogue.svg"],
				{x: (104 / 1280) * ui_canvas.width, y: (471.5 / 720) * ui_canvas.height},
				{width: 1280 * 0.844094488, height: (1280 * 0.844095588) / aspect_ratio },
				false));

	var dialogue_button = assets["ui"]["dialogue_skip.svg"].get();
	aspect_ratio = dialogue_button.width / dialogue_button.height;
	controller.add_element(new UIElement(assets["ui"]["dialogue_skip.svg"],
				{x: (484 / 1280) * ui_canvas.width , y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_skip_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_auto.svg"],
				{x: (595.5 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_auto_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_scene.svg"],
				{x: (707 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_scene_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_log.svg"],
				{x: (818.5 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_log_hover.svg"]));

	var bottom_button = assets["ui"]["bottom_save.svg"].get();
	aspect_ratio = bottom_button.width / bottom_button.height;
	controller.add_element(new UIElement(assets["ui"]["bottom_save.svg"],
				{x: (263 / 1280) * ui_canvas.width , y: (694 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_save_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_load.svg"],
				{x: (451 / 1280) * ui_canvas.width , y: (694 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_load_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_config.svg"],
				{x: (639 / 1280) * ui_canvas.width , y: (694 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_config_hover.svg"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_menu.svg"],
				{x: (827 / 1280) * ui_canvas.width , y: (694 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_menu_hover.svg"]));


	scene.register_ui_handlers();

	scene.set_backdrop("had_background.svg");
	scene.add_character(new Character("had_junko.svg", scene.positions.RIGHT));
	scene.add_character(new Character("had_pko.svg", scene.positions.LEFT));
	scene.render();
	//scene.play_bgm("morejo.mp3");
}

$(document).ready(setup);
