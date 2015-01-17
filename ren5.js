var IMG_EXTS = ["png", "jpg", "jpeg", "bmp"];
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
			this[category][asset] = new Asset(asset, asset_path, function() {
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
		return null;
	} else {
		return null;
	}
}

Asset.prototype.get = function() {
	return this.asset;
}

function requirements() {
	return {scenes: ["default.png"],
		characters: ["jeff.png", "pj.png"],
		bgm: []}
}



/*
 * ===================
 * SCENE DRAWING STUFF
 * ===================
 */

function draw_scene(context, assets, scene_name) {
	context.drawImage(assets["scenes"][scene_name].get(), 0, 0);
}

function draw_char(context, assets, char_name) {
	context.drawImage(assets["characters"][char_name].get(), 0, 0);
}

/*
 * =========
 * MAIN LOOP
 * =========
 */

function setup() {
	var load_complete = new Event("load_complete");
	var assets = null;
	document.addEventListener("load_complete", function() {
		run(assets)
	});
	assets = new AssetStore(requirements(), load_complete);
}

function run(assets) {
	console.log(assets);
	var canvas = document.getElementById("ren5");
	var context = canvas.getContext("2d");
	draw_scene(context, assets, "default.png");
	draw_char(context, assets, "jeff.png");
}

$(document).ready(setup);
