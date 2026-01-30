extends CharacterBody2D

@export var speed: float = 240.0
@export var acceleration: float = 2200.0
@export var deceleration: float = 2600.0
@export var gravity: float = 1400.0
@export var jump_velocity: float = -520.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var camera: Camera2D = $Camera2D

func _ready() -> void:
	camera.enabled = true
	camera.make_current()
	_sprite_setup()


func _physics_process(delta: float) -> void:
	# Horizontal move
	var axis := Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left")
	var target_x := axis * speed
	if axis != 0.0:
		velocity.x = move_toward(velocity.x, target_x, acceleration * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, deceleration * delta)

	# Gravity + jump
	if not is_on_floor():
		velocity.y += gravity * delta
	else:
		if Input.is_action_just_pressed("ui_accept") or Input.is_action_just_pressed("ui_up"):
			velocity.y = jump_velocity

	move_and_slide()


func _sprite_setup() -> void:
	# Simple placeholder figure (hood-like body block)
	var w := 24
	var h := 32
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))

	# cloak/body
	for y in range(8, h):
		for x in range(4, w - 4):
			img.set_pixel(x, y, Color(0.75, 0.78, 0.88, 1.0))

	# hood shadow
	for y2 in range(0, 14):
		for x2 in range(2, w - 2):
			img.set_pixel(x2, y2, Color(0.18, 0.18, 0.22, 1.0))

	# eyes
	img.set_pixel(9, 9, Color(0.95, 0.90, 0.55, 1.0))
	img.set_pixel(14, 9, Color(0.95, 0.90, 0.55, 1.0))

	sprite.texture = ImageTexture.create_from_image(img)
	sprite.centered = true
