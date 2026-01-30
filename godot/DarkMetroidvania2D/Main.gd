extends Node2D

@onready var tile_map: TileMap = $TileMap

const TILE_SIZE := Vector2i(32, 32)
const ATLAS_FLOOR := Vector2i(0, 0)
const ATLAS_WALL := Vector2i(1, 0)

var _source_id: int = -1

func _ready() -> void:
	tile_map.tile_set = _create_tileset()
	_generate_branchy_dungeon()


func _create_tileset() -> TileSet:
	var ts := TileSet.new()
	ts.add_physics_layer()
	var atlas := TileSetAtlasSource.new()
	atlas.texture_region_size = TILE_SIZE
	atlas.texture = _make_tiles_texture()
	_source_id = ts.add_source(atlas)
	atlas.create_tile(ATLAS_FLOOR)
	atlas.create_tile(ATLAS_WALL)

	# Make wall tile collidable (full 32x32 block)
	var wall_data: TileData = atlas.get_tile_data(ATLAS_WALL, 0)
	wall_data.add_collision_polygon(0)
	var points := PackedVector2Array([
		Vector2(0, 0),
		Vector2(TILE_SIZE.x, 0),
		Vector2(TILE_SIZE.x, TILE_SIZE.y),
		Vector2(0, TILE_SIZE.y),
	])
	wall_data.set_collision_polygon_points(0, 0, points)

	return ts


func _make_tiles_texture() -> Texture2D:
	# 2 tiles side-by-side (64x32): floor + wall
	var img := Image.create(TILE_SIZE.x * 2, TILE_SIZE.y, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))

	# floor tile (dark stone)
	for y in range(TILE_SIZE.y):
		for x in range(TILE_SIZE.x):
			img.set_pixel(x, y, Color(0.12, 0.12, 0.14, 1.0))

	# wall tile (slightly brighter)
	for y2 in range(TILE_SIZE.y):
		for x2 in range(TILE_SIZE.x, TILE_SIZE.x * 2):
			img.set_pixel(x2, y2, Color(0.20, 0.20, 0.24, 1.0))

	return ImageTexture.create_from_image(img)


func _carve_rect(floor: Dictionary, pos: Vector2i, size: Vector2i) -> void:
	for yy in range(pos.y, pos.y + size.y):
		for xx in range(pos.x, pos.x + size.x):
			floor[Vector2i(xx, yy)] = true


func _carve_corridor(floor: Dictionary, a: Vector2i, b: Vector2i) -> void:
	var x := a.x
	var y := a.y
	while x != b.x:
		floor[Vector2i(x, y)] = true
		x += 1 if b.x > x else -1
	while y != b.y:
		floor[Vector2i(x, y)] = true
		y += 1 if b.y > y else -1
	floor[Vector2i(x, y)] = true


func _generate_branchy_dungeon() -> void:
	# This is a simple placeholder dungeon layout generator.
	# It creates a hub and multiple regions connected by branching corridors.
	var w := 140
	var h := 90
	var floor: Dictionary = {}

	# Room centers (roughly inspired by the ASCII map structure)
	var hub := Vector2i(70, 30)
	var region_a := Vector2i(45, 42)
	var region_b := Vector2i(95, 42)
	var region_c := Vector2i(45, 60)
	var grotto := Vector2i(70, 55)
	var region_d := Vector2i(100, 60)
	var region_e := Vector2i(75, 78)

	# Rooms
	_carve_rect(floor, hub - Vector2i(8, 4), Vector2i(16, 8))
	_carve_rect(floor, region_a - Vector2i(10, 5), Vector2i(20, 10))
	_carve_rect(floor, region_b - Vector2i(10, 5), Vector2i(20, 10))
	_carve_rect(floor, region_c - Vector2i(11, 6), Vector2i(22, 12))
	_carve_rect(floor, grotto - Vector2i(9, 5), Vector2i(18, 10))
	_carve_rect(floor, region_d - Vector2i(11, 6), Vector2i(22, 12))
	_carve_rect(floor, region_e - Vector2i(12, 6), Vector2i(24, 12))

	# Branching corridors
	_carve_corridor(floor, hub, region_a)
	_carve_corridor(floor, hub, region_b)
	_carve_corridor(floor, region_a, region_c)
	_carve_corridor(floor, region_b, region_d)
	_carve_corridor(floor, region_c, grotto)
	_carve_corridor(floor, grotto, region_d)
	_carve_corridor(floor, region_d, region_e)
	_carve_corridor(floor, region_c, region_e) # extra branch

	# Draw tiles
	tile_map.clear()
	for k in floor.keys():
		tile_map.set_cell(0, k, _source_id, ATLAS_FLOOR)

	# Add simple walls around floors
	var offsets: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
	for k2v in floor.keys():
		var k2: Vector2i = k2v
		for off: Vector2i in offsets:
			var p: Vector2i = k2 + off
			if p.x < 0 or p.y < 0 or p.x >= w or p.y >= h:
				continue
			if not floor.has(p) and tile_map.get_cell_source_id(0, p) == -1:
				tile_map.set_cell(0, p, _source_id, ATLAS_WALL)

	# Put player in hub center
	var player := $Player as Node2D
	player.position = Vector2(hub.x * TILE_SIZE.x, hub.y * TILE_SIZE.y)
