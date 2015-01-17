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

function Scene(context, assets, ui_controller) {
	this.context = context;
	this.assets = assets;
	this.ui_controller = ui_controller;
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

Scene.prototype.draw_backdrop = function(backdrop_name) {
	var backdrop = this.assets["backdrops"][backdrop_name].get();
	var draw_height = this.context.canvas.clientHeight;
	var draw_width = this.context.canvas.clientWidth;

	this.context.fillStyle = "#FFFFFF";
	this.context.clearRect(0, 0, draw_height, draw_width);

	this.context.drawImage(backdrop,
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
	var draw_height = this.context.canvas.clientHeight;
	var draw_width = aspect_ratio * draw_height;

	if (typeof(position) === "undefined") {
		position = this.positions["LEFT"];
	}

	var absolute_x = (position.x * this.context.canvas.clientWidth) - draw_width / 2;
	var absolute_y = (position.y * this.context.canvas.clientHeight) - draw_height / 2;

	this.context.drawImage(character,
			absolute_x, absolute_y,
			draw_width, draw_height);
}

Scene.prototype.play_bgm = function(bgm_name) {
	// Note to future Jeff: setting sound.currentTime (sometimes) fires the
	// canplaythrough event which will probably do weird things to the
	// loading progress. That probably does something bad.
	var sound = this.assets["bgm"][bgm_name].get();

	sound.currentTime = 0;
	sound.play();
}

/*
 * ========
 * UI STUFF
 * ========
 */

function UIController() {
	this.elements = [];
}

UIController.prototype.add_element = function(ui_element) {
	this.elements.push(ui_element);
}

UIController.prototype.handle_click = function(e) {
	var canvas = document.getElementById("ren5");

	var x = 0;
	var y = 0;

	if (typeof(e.x) !== "undefined" && typeof(e.y) !== "undefined") {
		x = e.x - canvas.offsetLeft;
		y = e.y - canvas.offsetTop;
	} else {
		// Firefox does weird things with click position
		x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - canvas.offsetLeft;
		y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop - canvas.offsetTop;
	}


	console.log(x + ", " + y);
}

function UIElement(asset, position, size) {
	this.asset = asset;
	this.position = position;
	this.size = size;
}

UIElement.in_bounds = function(position) {
	var left_x = this.position.x;
	var right_x = this.position.x + this.size.x;
	var top_y = this.position.y;
	var bottom_y = this.position.y + this.size.y;
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
		bgm: ["morejo.mp3"]}
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
	var canvas = document.getElementById("ren5");
	var context = canvas.getContext("2d");
	var controller = new UIController();
	var scene = new Scene(context, assets, controller);

	canvas.addEventListener("mouseup", controller.handle_click);

	scene.draw_backdrop("had_background.svg");
	scene.draw_character("had_junko.svg", scene.positions.RIGHT);
	scene.draw_character("had_pko.svg", scene.positions.LEFT);
	//scene.play_bgm("morejo.mp3");
}

$(document).ready(setup);
