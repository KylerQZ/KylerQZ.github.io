extends VehicleBody3D

@export var max_engine_force: float = 150.0
@export var max_brake_force: float = 30.0
@export var max_steer_angle: float = 0.45

@export var engine_force_smoothing: float = 8.0
@export var steer_smoothing: float = 10.0

var _engine_force_target: float = 0.0
var _steer_target: float = 0.0

func reset_state() -> void:
	_engine_force_target = 0.0
	_steer_target = 0.0
	engine_force = 0.0
	steering = 0.0
	brake = 0.0

func _physics_process(delta: float) -> void:
	var accel: float = Input.get_action_strength("ui_up")
	var reverse: float = Input.get_action_strength("ui_down")
	var steer_input: float = Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left")
	var handbrake: float = Input.get_action_strength("ui_select")

	_engine_force_target = (accel - reverse) * max_engine_force
	_steer_target = steer_input * max_steer_angle

	var engine_t: float = 1.0 - exp(-engine_force_smoothing * delta)
	var steer_t: float = 1.0 - exp(-steer_smoothing * delta)

	engine_force = lerpf(engine_force, _engine_force_target, engine_t)
	steering = lerpf(steering, _steer_target, steer_t)

	if handbrake > 0.0:
		brake = max_brake_force
	else:
		brake = 0.0
