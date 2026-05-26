extends Camera3D

@export var target_path: NodePath
@export var height: float = 14.0
@export var distance: float = 16.0
@export var tilt_degrees: float = 55.0
@export var smooth: float = 10.0

var _target: Node3D

func _ready() -> void:
	if target_path != NodePath(""):
		_target = get_node_or_null(target_path) as Node3D

func _process(delta: float) -> void:
	if _target == null:
		return

	var desired_origin: Vector3 = _target.global_position
	var desired_pos: Vector3 = desired_origin + Vector3(0.0, height, distance)
	var t: float = 1.0 - exp(-smooth * delta)
	global_position = global_position.lerp(desired_pos, t)
	look_at(desired_origin, Vector3.UP)
	rotation.x = deg_to_rad(-tilt_degrees)
