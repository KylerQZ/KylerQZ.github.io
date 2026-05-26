extends Camera3D

@export var target_path: NodePath
@export var height: float = 3.0
@export var distance: float = 7.0
@export var smooth: float = 8.0
@export var min_height_above_target: float = 1.0

var _target: Node3D

func _ready() -> void:
	if target_path != NodePath(""):
		_target = get_node_or_null(target_path) as Node3D

func _process(delta: float) -> void:
	if _target == null:
		return

	var back_dir: Vector3 = _target.global_transform.basis.z
	back_dir.y = 0.0
	if back_dir.length_squared() < 0.0001:
		back_dir = Vector3(0.0, 0.0, 1.0)
	else:
		back_dir = back_dir.normalized()

	var desired_pos: Vector3 = _target.global_position + Vector3.UP * height + back_dir * distance
	desired_pos.y = maxf(desired_pos.y, _target.global_position.y + min_height_above_target)

	var t: float = 1.0 - exp(-smooth * delta)
	global_position = global_position.lerp(desired_pos, t)
	look_at(_target.global_position + Vector3.UP * 1.0, Vector3.UP)
