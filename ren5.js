// TODO: Just added ui_hover_context to the UI Controller
// Need to make it render to the hover context
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
			var alias = asset.split(".")[0];
			this[category][alias] = new Asset(alias, asset_path,
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
function Scene(backdrop_context, character_context, ui_context, ui_hover_context, assets, ui_controller, script, name_writer, script_writer) {
	this.backdrop_context = backdrop_context;
	this.character_context = character_context;
	this.ui_context = ui_context;
    this.ui_hover_context = ui_hover_context;
	this.assets = assets;
	this.ui_controller = ui_controller;

	this.script = script;
	this.script_progress = 0;
	this.name_writer = name_writer;
	this.script_writer = script_writer;

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
	this.name_writer.write_text(this.script[this.script_progress].character.toUpperCase());
	this.script_writer.write_text(this.script[this.script_progress].line);
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
	document.getElementById("ren5-container").style.cursor = "auto";
	this.undo_hover();
	this.active = null;
}

Scene.prototype.hover_handler = function(ui_element) {
	// Must preserve this.active for undo_hover
	// Thus these operations must occur in this order
	this.undo_hover();
	this.active = this.ui_controller.active;
	this.render_ui_element_hover(ui_element, true);
	document.getElementById("ren5-container").style.cursor = "pointer";
}

Scene.prototype.undo_hover = function() {
	// this.active is the current dirty element (the previous active element)
	if (this.active !== null) {
		this.render_ui_element_hover(this.active, false);
	}
}

Scene.prototype.click_handler = function(ui_element) {
	if (ui_element !== null) {
		console.log("Click callback on " + ui_element.asset.alias);
	} else {
		if (this.script_progress < this.script.length) {
			this.script_progress += 1;
		} else {
			// just looping text code
			this.script_progress = 0;
		}
		this.name_writer.write_text(this.script[this.script_progress].character.toUpperCase());
		this.script_writer.write_text(this.script[this.script_progress].line);
	}
}

Scene.prototype.set_backdrop = function(backdrop_name) {
	this.backdrop = backdrop_name;
}

Scene.prototype.draw_backdrop = function(backdrop_name) {
	var backdrop = this.assets["backdrops"][backdrop_name].get();
	var draw_height = this.backdrop_context.canvas.clientHeight;
	var draw_width = this.backdrop_context.canvas.clientWidth;

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

Scene.prototype.render_ui_element = function(ui_element) {
		this.ui_context.drawImage(ui_element.asset.get(),
				ui_element.position.x, ui_element.position.y,
				ui_element.size.width, ui_element.size.height);
}

Scene.prototype.render_ui_element_hover = function(ui_element, active) {
	if (typeof(active) === "undefined") {
		active = false;	
	}

	if (active) {
		this.ui_hover_context.drawImage(ui_element.hover_asset.get(),
				ui_element.position.x, ui_element.position.y,
				ui_element.size.width, ui_element.size.height);
	} else {
		this.ui_hover_context.clearRect(
				ui_element.position.x, ui_element.position.y,
				ui_element.size.width, ui_element.size.height);
	}
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
	} else {
		document.dispatchEvent(new CustomEvent("ren5-click", {detail: {element: null}}));
	}
}

UIController.prototype.handle_move = function(e) {
	var mouse_coords = this.get_mouse_coords(e);
	if (this.active && this.active.in_bounds(mouse_coords))
		return;

	this.active = null;

	for (ui_element of this.elements) {
		if (ui_element.interactable && ui_element.in_bounds(mouse_coords)) {
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
	return (position.x >= left_x) && (position.x <= right_x) && (position.y >= top_y) && (position.y <= bottom_y);
}

/*
 * ============
 * SCRIPT STUFF
 * ============
 */
/*
 * Note that x and y change meaning according to align and baseline:
 * align = left makes the x coordinate the left edge
 * align = right makes the x coordinate the right edge
 * align = center makes the x coordinate the center
 * baseline is more nuanced. We default to hanging because having y be the
 * absolute top of the bounding box seems to make the most intuitive sense
 * in terms of trying to make a layout agnostic of font size
 */
function Writer(writing_context, x, y, width, height, font, align, baseline) {
	this.writing_context = writing_context;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.font = font;
	if (typeof(align) !== "undefined") {
		this.align = align;
	} else {
		this.align = "start";
	}
	if (typeof(baseline) !== "undefined") {
		this.baseline = baseline;
	} else {
		this.baseline = "hanging";
	}
}

Writer.prototype.write_text = function(text) {
	// Font properties
	this.writing_context.font = this.font;
	this.writing_context.fillStyle = "#FFFFFF";
	this.writing_context.textAlign = this.align;

	this.clear_text();

	// Text positioning
	var words = text.split(" ");
	var line = "";
	var vert_offset = 0;
	for (word of words) {
		var test_line = line + word + " ";
		var test_width = this.writing_context.measureText(test_line).width;
		if (test_width >= this.width) {
			this.writing_context.fillText(line, this.x, this.y + vert_offset);
			line = word + " ";
			vert_offset += 30; //TOTALLY ARBITRARY
			//ALSO NEED TO ACCOUNT FOR VERTICAL OVERFLOW
		} else {
			line = test_line;
		}
	}

	this.writing_context.fillText(line, this.x, this.y + vert_offset);

	//this.writing_context.fillText(text, this.x, this.y);
}

Writer.prototype.clear_text = function() {
	var x = 0;
	var y = 0;
	var align = this.align;
	var direction = getComputedStyle(this.writing_context.canvas).direction;
		
	if (direction === "ltr") {
		if (align === "start") {
			align = "left";
		} else if (align === "end") {
			align = "right";
		}
	} else if (direction === "rtl") {
		if (align === "start") {
			align = "right";
		} else if (align === "end") {
			align = "left";
		}
	}

	// Note: this isn't changing y, but it should. That probably involves font math.
	if (align === "left") {
		x = this.x;
		y = this.y;
	} else if (align === "right") {
		x = this.x - this.width;
		y = this.y;
	} else if (align === "center") {
		x = this.x - (this.width / 2);
		y = this.y;
	}

	this.writing_context.clearRect(x, y, this.width, this.height);
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
		ui: ["dialogue.svg", "dialogue_next.svg",
		"bottom_config.svg", "bottom_load.svg", "bottom_save.svg", "bottom_menu.svg",
		"dialogue_auto.svg", "dialogue_log.svg", "dialogue_scene.svg", "dialogue_skip.svg",
		"bottom_config_hover.svg", "bottom_load_hover.svg", "bottom_save_hover.svg", "bottom_menu_hover.svg",
		"dialogue_auto_hover.svg", "dialogue_log_hover.svg", "dialogue_scene_hover.svg", "dialogue_skip_hover.svg"]};
}

function load_script() {
	return [{character: "P-Ko", line: "Finally, we're here at Benn Apps..."},
		{character: "P-Ko", line: "Huh, Benn State looks really nice!"},
		{character: "Jeffrica", line: "UBenn."},
		{character: "P-Ko", line: "What...?"},
		{character: "Jeffrica", line: "We're at UBenn..."},
		{character: "Jeffrica", line: "The Ivy League one."},
		{character: "Jeffrica", line: "The better one."},
		{character: "P-Ko", line: "Are they not the same thing?"},
		{character: "Jeffrica", line: "No. No, they aren't even in the same city."},
		{character: "P-Ko", line: "Ooooohhhh..."},
		{character: "P-Ko", line: "Whatever! It's not Rootgers, so I don't really care and I'm super cold. Let's register!"},
		{character: "Jeffrica", line: "..."},
		{character: "Actual Jeff", line: "Lorem ipsum dolor sit go fuck yourself. I sure am glad I added in that support for long lines of text look at how pretty it wraps ooooooo"}];
}

function setup() {
	var load_complete = new Event("load_complete");
	var assets = null;
	//var font_loader = document.createElement("span");
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
    var ui_hover_context = document.getElementById("ren5-ui-hover");
	var writing_canvas = document.getElementById("ren5-text");

	var backdrop_context = backdrop_canvas.getContext("2d");
	var character_context = character_canvas.getContext("2d");
	var ui_context = ui_canvas.getContext("2d");
    var ui_hover_context = ui_hover_context.getContext("2d");
	var writing_context = writing_canvas.getContext("2d");

	var controller = new UIController();

	var script = load_script();
	var script_writer = new Writer(writing_context,
			(250 / 1280) * writing_canvas.width, (540 / 720) * writing_canvas.height,
			(745 / 1280) * writing_canvas.width, (115 / 720) * writing_canvas.height,
			"25pt Calibri", "start");
	var name_writer = new Writer(writing_context,
			(365 / 1280) * writing_canvas.width, (490 / 720) * writing_canvas.height,
			(210 / 1280) * writing_canvas.width, (30 / 720) * writing_canvas.height,
			"18pt Montserrat", "center");
	writing_context.textBaseline = "hanging";

	var scene = new Scene(backdrop_context, character_context, ui_context, ui_hover_context, assets, controller, script, name_writer, script_writer);

	writing_canvas.addEventListener("mouseup", function(e) {
		controller.handle_click(e);
	});

	writing_canvas.addEventListener("mousemove", function(e) {
		controller.handle_move(e);
	});

	// Only for proof of concept purposes
	var dialogue_asset = assets["ui"]["dialogue"].get();
	var aspect_ratio = dialogue_asset.width / dialogue_asset.height;
	controller.add_element(new UIElement(assets["ui"]["dialogue"],
				{x: (104 / 1280) * ui_canvas.width, y: (471.5 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (1072 / 1280), height: (ui_canvas.width * (1072 / 1280)) / aspect_ratio },
				false));

	var dialogue_button = assets["ui"]["dialogue_skip"].get();
	aspect_ratio = dialogue_button.width / dialogue_button.height;
	controller.add_element(new UIElement(assets["ui"]["dialogue_skip"],
				{x: (482 / 1280) * ui_canvas.width , y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_skip_hover"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_auto"],
				{x: (594 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_auto_hover"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_scene"],
				{x: (706 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_scene_hover"]));
	controller.add_element(new UIElement(assets["ui"]["dialogue_log"],
				{x: (818 / 1280) * ui_canvas.width, y: (485 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (111.5 / 1280), height: (ui_canvas.width * (111.5 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["dialogue_log_hover"]));

	var bottom_button = assets["ui"]["bottom_save"].get();
	aspect_ratio = bottom_button.width / bottom_button.height;
	controller.add_element(new UIElement(assets["ui"]["bottom_save"],
				{x: (263 / 1280) * ui_canvas.width , y: (695 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_save_hover"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_load"],
				{x: (451 / 1280) * ui_canvas.width , y: (695 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_load_hover"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_config"],
				{x: (639 / 1280) * ui_canvas.width , y: (695 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_config_hover"]));
	controller.add_element(new UIElement(assets["ui"]["bottom_menu"],
				{x: (827 / 1280) * ui_canvas.width , y: (695 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (188 / 1280), height: (ui_canvas.width * (188 / 1280)) / aspect_ratio},
				true,
				assets["ui"]["bottom_menu_hover"]));

	var dialogue_next = assets["ui"]["dialogue_next"].get();
	aspect_ratio = dialogue_next.width / dialogue_next.height;
	controller.add_element(new UIElement(assets["ui"]["dialogue_next"],
				{x: (1039.75 / 1280) * ui_canvas.width, y: (617.25 / 720) * ui_canvas.height},
				{width: ui_canvas.width * (112.67 / 1280), height: (ui_canvas.width * (112.67 / 1280)) / aspect_ratio},
				false));

	scene.register_ui_handlers();

	scene.set_backdrop("had_background");
	scene.add_character(new Character("had_junko", scene.positions.RIGHT));
	scene.add_character(new Character("had_pko", scene.positions.LEFT));
	scene.render();
	//scene.play_bgm("morejo");
}

document.addEventListener("DOMContentLoaded", function() {
	setup()
});
