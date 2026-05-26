extends CharacterBody3D

@export var acceleration: float = 26.0
@export var max_speed: float = 22.0
@export var brake_strength: float = 40.0

@export var steer_speed: float = 2.7
@export var steer_speed_at_max: float = 1.6

@export var forward_friction: float = 10.0
@export var lateral_friction: float = 22.0

@export var gravity: float = 30.0

var _yaw: float = 0.0

func reset_state() -> void:
	_yaw = 0.0

func _ready() -> void:
	_yaw = rotation.y

func _physics_process(delta: float) -> void:
	var throttle: float = Input.get_action_strength("ui_up") - Input.get_action_strength("ui_down")
	var steer: float = Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left")

	var planar: Vector3 = Vector3(velocity.x, 0.0, velocity.z)
	var speed: float = planar.length()

	var steer_t: float = clampf(speed / max_speed, 0.0, 1.0)
	var steer_rate: float = lerpf(steer_speed, steer_speed_at_max, steer_t)
	_yaw += steer * steer_rate * delta
	rotation.y = _yaw

	var forward: Vector3 = -global_transform.basis.z
	var right: Vector3 = global_transform.basis.x

	var forward_speed: float = planar.dot(forward)
	var lateral_speed: float = planar.dot(right)

	if throttle != 0.0:
		forward_speed += throttle * acceleration * delta
	else:
		forward_speed = move_toward(forward_speed, 0.0, forward_friction * delta)

	if throttle < 0.0 and speed > 0.5:
		forward_speed = move_toward(forward_speed, 0.0, brake_strength * delta)

	lateral_speed = move_toward(lateral_speed, 0.0, lateral_friction * delta)

	forward_speed = clampf(forward_speed, -max_speed * 0.5, max_speed)

	planar = forward * forward_speed + right * lateral_speed
	velocity.x = planar.x
	velocity.z = planar.z

	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		velocity.y = 0.0

	move_and_slide()
