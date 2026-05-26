extends Node3D

@export var floor_size: float = 240.0
@export var wall_height: float = 2.0
@export var wall_thickness: float = 1.0

@export var car_spawn: Vector3 = Vector3(0.0, 2.0, 0.0)
@export var car_model_scene_path: String = ""

var _car: VehicleBody3D

func _ready() -> void:
	_create_lighting()
	_create_floor()
	_create_car()
	_create_camera()

func _physics_process(_delta: float) -> void:
	if Input.is_key_pressed(KEY_R) and _car != null:
		_reset_car()

func _create_lighting() -> void:
	var dir: DirectionalLight3D = DirectionalLight3D.new()
	dir.light_energy = 1.2
	dir.rotation_degrees = Vector3(-60.0, 30.0, 0.0)
	add_child(dir)

	var env: WorldEnvironment = WorldEnvironment.new()
	var environment: Environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.08, 0.09, 0.11)
	env.environment = environment
	add_child(env)

func _create_floor() -> void:
	var floor: StaticBody3D = StaticBody3D.new()
	floor.name = "Floor"
	add_child(floor)

	var mesh_instance: MeshInstance3D = MeshInstance3D.new()
	var plane: PlaneMesh = PlaneMesh.new()
	plane.size = Vector2(floor_size, floor_size)
	mesh_instance.mesh = plane
	floor.add_child(mesh_instance)

	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: BoxShape3D = BoxShape3D.new()
	shape.size = Vector3(floor_size, 1.0, floor_size)
	collision.shape = shape
	collision.position = Vector3(0.0, -0.5, 0.0)
	floor.add_child(collision)

func _create_walls() -> void:
	var half := floor_size * 0.5
	_create_wall(Vector3(0.0, wall_height * 0.5, -half), Vector3(floor_size, wall_height, wall_thickness))
	_create_wall(Vector3(0.0, wall_height * 0.5, half), Vector3(floor_size, wall_height, wall_thickness))
	_create_wall(Vector3(-half, wall_height * 0.5, 0.0), Vector3(wall_thickness, wall_height, floor_size))
	_create_wall(Vector3(half, wall_height * 0.5, 0.0), Vector3(wall_thickness, wall_height, floor_size))

func _create_wall(pos: Vector3, size: Vector3) -> void:
	var wall := StaticBody3D.new()
	wall.position = pos
	add_child(wall)

	var mesh_instance := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh_instance.mesh = box
	wall.add_child(mesh_instance)

	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	wall.add_child(collision)

func _create_obstacles() -> void:
	_create_box_obstacle(Vector3(-10.0, 0.6, -10.0), Vector3(4.0, 1.2, 4.0))
	_create_box_obstacle(Vector3(12.0, 0.6, 6.0), Vector3(6.0, 1.2, 2.0))
	_create_box_obstacle(Vector3(0.0, 0.6, 18.0), Vector3(10.0, 1.2, 2.0))

func _create_box_obstacle(pos: Vector3, size: Vector3) -> void:
	var body: StaticBody3D = StaticBody3D.new()
	body.position = pos
	add_child(body)

	var mesh_instance: MeshInstance3D = MeshInstance3D.new()
	var box: BoxMesh = BoxMesh.new()
	box.size = size
	mesh_instance.mesh = box
	body.add_child(mesh_instance)

	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: BoxShape3D = BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)

func _create_car() -> void:
	_car = VehicleBody3D.new()
	_car.name = "Car"
	_car.position = car_spawn
	_car.mass = 1200.0
	var car_script: Script = load("res://scripts/VehicleCar.gd") as Script
	_car.set_script(car_script)
	add_child(_car)

	if car_model_scene_path != "" and ResourceLoader.exists(car_model_scene_path):
		var car_scene: PackedScene = load(car_model_scene_path) as PackedScene
		var model_node: Node = car_scene.instantiate()
		_car.add_child(model_node)
		if model_node is Node3D:
			(model_node as Node3D).position = Vector3(0.0, 0.8, 0.0)
	else:
		var mesh_instance: MeshInstance3D = MeshInstance3D.new()
		var box: BoxMesh = BoxMesh.new()
		box.size = Vector3(1.7, 0.7, 3.4)
		mesh_instance.mesh = box
		mesh_instance.position = Vector3(0.0, 0.8, 0.0)
		_car.add_child(mesh_instance)

	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: BoxShape3D = BoxShape3D.new()
	shape.size = Vector3(1.7, 0.7, 3.4)
	collision.shape = shape
	collision.position = Vector3(0.0, 0.8, 0.0)
	_car.add_child(collision)

	_create_wheel(Vector3(-0.85, 0.55, -1.35), true, false)
	_create_wheel(Vector3(0.85, 0.55, -1.35), true, false)
	_create_wheel(Vector3(-0.85, 0.55, 1.35), false, true)
	_create_wheel(Vector3(0.85, 0.55, 1.35), false, true)

func _create_wheel(local_pos: Vector3, use_as_steering: bool, use_as_traction: bool) -> void:
	var wheel: VehicleWheel3D = VehicleWheel3D.new()
	wheel.position = local_pos
	wheel.use_as_steering = use_as_steering
	wheel.use_as_traction = use_as_traction

	wheel.wheel_radius = 0.45
	wheel.wheel_rest_length = 0.35
	wheel.suspension_travel = 0.2
	wheel.suspension_stiffness = 12.0
	wheel.damping_compression = 0.35
	wheel.damping_relaxation = 0.55
	wheel.wheel_friction_slip = 8.0
	wheel.wheel_roll_influence = 0.05

	_car.add_child(wheel)

	var wheel_mesh_instance: MeshInstance3D = MeshInstance3D.new()
	var cylinder: CylinderMesh = CylinderMesh.new()
	cylinder.top_radius = wheel.wheel_radius
	cylinder.bottom_radius = wheel.wheel_radius
	cylinder.height = 0.25
	wheel_mesh_instance.mesh = cylinder
	wheel_mesh_instance.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	wheel.add_child(wheel_mesh_instance)

func _create_camera() -> void:
	var cam: Camera3D = Camera3D.new()
	cam.current = true
	var cam_script: Script = load("res://scripts/ChaseCamera.gd") as Script
	cam.set_script(cam_script)
	add_child(cam)

	cam.set("target_path", cam.get_path_to(_car))
	cam.set("height", 3.2)
	cam.set("distance", 8.5)
	cam.set("smooth", 9.0)

func _reset_car() -> void:
	_car.global_transform = Transform3D(Basis.IDENTITY, car_spawn)
	_car.linear_velocity = Vector3.ZERO
	_car.angular_velocity = Vector3.ZERO
	if _car.has_method("reset_state"):
		_car.call("reset_state")
