import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three.meshline';

const COLORS = {
  background: 'black',
  light: '#ffffff',
  sky: '#aaaaff',
  ground: '#88ff88',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
};

const initialCameraPosition = new THREE.Vector3(3, 1, 3);
const defaultLineThickness: number = 0.02;

const BackDrop = (props) => {
  const refContainer = useRef<any>();
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
  const [target] = useState(new THREE.Vector3(0, 0, 0));
  const [scene] = useState(new THREE.Scene());
  const [_objs, setObjs] = useState<Array<THREE.Object3D>>([]);
  const [_mouse, setMouse] = useState<THREE.Vector2>(new THREE.Vector2(3, 4));
  const [frame, setFrame] = useState<number>(0);
  const _camera = useRef<THREE.PerspectiveCamera>(new THREE.PerspectiveCamera(initialCameraPosition));
  const _orbit = useRef<OrbitControls>();
  const _control = useRef<TransformControls>();
  const _intersectObj = useRef<THREE.Object3D>();
  const _lastIntersectObj = useRef<THREE.Object3D>();
  const isControlVisible = useRef<Boolean>(true);
  const _raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const isDrawMode = useRef<Boolean>(false);
  const isPenMode = useRef<Boolean>(true);
  const isPenDrawing = useRef<Boolean>(false);
  const meshLineArray = useRef<Array<Number>>([]);
  const meshLine = useRef<THREE.Mesh>();
  const meshLineColor = useRef<THREE.Color>(new THREE.Color(COLORS.black));
  const meshLineThickness = useRef<number>(defaultLineThickness);

  const addCube = () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.3,
      // transmission: 1,
      // thickness: 0.01, // Add refraction!
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    _objs.push(cube);
    _intersectObj.current = cube;
    _control.current.attach(_intersectObj.current);
  };

  const addSphere = () => {
    const geometry = new THREE.SphereGeometry(0.5);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.3,
      // transmission: 1,
      // thickness: 0.5, // Add refraction!
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    _objs.push(sphere);
    _intersectObj.current = sphere;
    _control.current.attach(_intersectObj.current);
  };

  const addPlane = () => {
    const geometry = new THREE.PlaneGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.3,
      // transmission: 1,
      // thickness: 0.5, // Add refraction!
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
    _objs.push(plane);
    _intersectObj.current = plane;
    _control.current.attach(_intersectObj.current);
  };

  const deleteShape = () => {
    if (_intersectObj.current != null) {
      let index = _objs.indexOf(_intersectObj.current);
      if (index !== -1) {
        _objs.splice(index, 1);
        _intersectObj.current.geometry.dispose();
        _intersectObj.current.material.dispose();
        scene.remove(_intersectObj.current);
        _control.current.detach();
      }
    }
  }

  const deleteAllShapes = () => {
    let i = 0;
    while (i < _objs.length) {
      if (_objs[i].geometry !== undefined) {
        if (_objs[i].geometry.type !== undefined && (_objs[i].geometry.type === 'BoxGeometry' || _objs[i].geometry.type === 'SphereGeometry' || _objs[i].geometry.type === 'PlaneGeometry')) {
          let index = _objs.indexOf(_objs[i]);
          if (index !== -1) {
            _control.current.detach();
            scene.remove(_objs[i]);
            _objs[i].geometry.dispose();
            _objs[i].material.dispose();
            _objs.splice(index, 1);
          } else {
            ++i;
          }
        } else {
          ++i;
        }
      } else {
        ++i;
      }
    }
  }

  const deleteAllLines = () => {
    let i = 0;
    while (i < _objs.length) {
      if (_objs[i].geometry !== undefined) {
        if (_objs[i].geometry.type !== undefined && _objs[i].geometry.type === 'MeshLine') {
          let index = _objs.indexOf(_objs[i]);
          if (index !== -1) {
            _control.current.detach();
            scene.remove(_objs[i]);
            _objs[i].geometry.dispose();
            _objs[i].material.dispose();
            _objs.splice(index, 1);
          } else {
            ++i;
          }
        } else {
          ++i;
        }
      } else {
        ++i;
      }
    }
  }

  const startDrawMode = () => {
    disableControls();
    _orbit.current.enabled = false;
    isDrawMode.current = true;
    startPenMode();
  };

  const stopDrawMode = () => {
    _orbit.current.enabled = true;
    isDrawMode.current = false;
  };

  const startPenMode = () => {
    isPenMode.current = true;
  }

  const stopPenMode = () => {
    isPenMode.current = false;
  }

  const setLineColor = (color: string) => {
    switch (color) {
      case 'black':
        meshLineColor.current = new THREE.Color(COLORS.black);
        break;
      case 'red':
        meshLineColor.current = new THREE.Color(COLORS.red);
        break;
      case 'green':
        meshLineColor.current = new THREE.Color(COLORS.green);
        break;
      case 'blue':
        meshLineColor.current = new THREE.Color(COLORS.blue);
        break;
    }
  }

  const setLineThickness = (thickness: string) => {
    switch (thickness) {
      case 'thin':
        meshLineThickness.current = 0.01;
        break;
      case 'normal':
        meshLineThickness.current = 0.03;
        break;
      case 'thick':
        meshLineThickness.current = 0.05;
        break;
    }
  }

  const changeControlType = (type: string) => {
    switch (type) {
      case 'translate':
        _control.current.setMode('translate');
        break;
      case 'rotate':
        _control.current.setMode('rotate');
        break;
      case 'scale':
        _control.current.setMode('scale');
        break;
    }
  };

  const disableControls = () => {
    _control.current.detach();
  };

  const handleWindowResize = useCallback(() => {
    const { current: container } = refContainer;
    if (container && renderer) {
      const scW = container.clientWidth;
      const scH = container.clientHeight;

      _camera.current.aspect = scW / scH;
      _camera.current.updateProjectionMatrix();

      renderer.setSize(scW, scH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }, [renderer]);

  const handleKeyDown = (e) => {
    switch (e.keyCode) {
      case 8: // backspace
        if (_intersectObj.current != null) {
          let index = _objs.indexOf(_intersectObj.current);
          if (index !== -1) {
            _objs.splice(index, 1);
            _intersectObj.current.geometry.dispose();
            _intersectObj.current.material.dispose();
            scene.remove(_intersectObj.current);
            _control.current.detach();
          }
        }
        break;
    }
  }

  // add a meshline mesh to the scene, and push it to the _objs array
  const handleMouseDown = (e) => {
    // if in Draw Mode
    if (isDrawMode.current === true) {
      // if in Pen Mode
      if (isPenMode.current === true) {
        // start recording the mouse intersect positions, and push to the meshline array
        _raycaster.current.setFromCamera(_mouse, _camera.current);
        let _intersects = _raycaster.current.intersectObjects(_objs);
        if (_intersects.length > 0) {
          isPenDrawing.current = true;
          meshLineArray.current.push(_intersects[0].point.x, _intersects[0].point.y, _intersects[0].point.z);
          let line = new MeshLine();
          line.setPoints(meshLineArray.current, p => meshLineThickness.current);
          let lineMaterial = new MeshLineMaterial({
            color: meshLineColor.current,
          })
          meshLine.current = new THREE.Mesh(line, lineMaterial);
          scene.add(meshLine.current);
          _objs.push(meshLine.current);
        } else {
          // isPenDrawing.current = false;
        }
      }
      // if not in draw mode, select the object and show the transform control handles
    } else {
      _raycaster.current.setFromCamera(_mouse, _camera.current);
      let _intersects = _raycaster.current.intersectObjects(_objs);
      if (_intersects.length > 0) {
        _intersectObj.current = _intersects[0].object;
        _control.current.attach(_intersectObj.current);
      }
    }
  };

  // find the corresponding meshline mesh in the scene and _objs array, replace it with the new meshline mesh
  // i.e., the last index of scene.objects() and _obj[_obj.length]
  const handleMouseMove = (e) => {
    // console.log(scene.children)
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    setMouse(mouse);
    if (isDrawMode.current === true) {
      if (isPenMode.current === true) {
        if (isPenDrawing.current === true) {
          // continue recording the mouse intersect positions, and push to the meshline array
          _raycaster.current.setFromCamera(_mouse, _camera.current);
          let _intersects = _raycaster.current.intersectObjects(_objs);
          if (_intersects.length > 0) {
            let index = _objs.indexOf(meshLine.current);
            if (index !== -1) {
              _objs.splice(index, 1);
              meshLine.current.geometry.dispose();
              meshLine.current.material.dispose();
              scene.remove(meshLine.current);
            }
            meshLineArray.current.push(_intersects[0].point.x, _intersects[0].point.y, _intersects[0].point.z);
            let line = new MeshLine();
            line.setPoints(meshLineArray.current, p => meshLineThickness.current);
            let lineMaterial = new MeshLineMaterial({
              color: meshLineColor.current,
            })
            meshLine.current = new THREE.Mesh(line, lineMaterial);
            // scene.children[scene.children.length - 1] = meshLine.current;
            // _objs[_objs.length - 1] = meshLine.current;
            // console.log(meshLine.current)
            scene.add(meshLine.current);
            _objs.push(meshLine.current);
          }
        }
      }
    }
  };

  // find the corresponding meshline mesh in the scene and _objs array, replace it with the final meshline mesh
  const handleMouseUp = () => {
    if (isDrawMode.current === true) {
      if (isPenMode.current === true) {
        // as soon as mouse up, make a mesh based on the meshline data collected by the mousedown & mousemove events
        // and then clear the meshline array, to prepare drawing the next meshline
        isPenDrawing.current = false;
        _raycaster.current.setFromCamera(_mouse, _camera.current);
        let _intersects = _raycaster.current.intersectObjects(_objs);
        if (_intersects.length > 0) {
          let index = _objs.indexOf(meshLine.current);
          if (index !== -1) {
            _objs.splice(index, 1);
            meshLine.current.geometry.dispose();
            meshLine.current.material.dispose();
            scene.remove(meshLine.current);
          }
          let line = new MeshLine();
          line.setPoints(meshLineArray.current, p => meshLineThickness.current);
          let lineMaterial = new MeshLineMaterial({
            color: meshLineColor.current,
          })
          meshLine.current = new THREE.Mesh(line, lineMaterial);
          // scene.children[scene.children.length - 1] = meshLine.current;
          // _objs[_objs.length - 1] = meshLine.current;
          scene.add(meshLine.current)
          _objs.push(meshLine.current)
          // set up raycast on mouse up
          // temporarily disable the meshline raycast, b/c it mess up w/ drawing new meshlines
          // meshLine.current.raycast = MeshLineRaycast;
          meshLineArray.current = [];
        }
      } else {
        // console.log('mouseup, raycast on the meshline and delete it')
      }
    }
  }

  const handleMouseClick = (e) => {

  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const { current: container } = refContainer;
    if (container && !renderer) {
      const scW = container.clientWidth;
      const scH = container.clientHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(scW, scH);
      renderer.setClearColor(0xffffff, 0);
      renderer.physicallyCorrectLights = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 2;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      setRenderer(renderer);

      // change scene background color
      scene.background = new THREE.Color(0xDDDDDD);

      const camera = new THREE.PerspectiveCamera<THREE.PerspectiveCamera>(50, scW / scH, 0.001, 50000);
      camera.position.copy(initialCameraPosition);
      camera.lookAt(target);
      _camera.current = camera;

      const directionalLight = new THREE.DirectionalLight(COLORS.light, 2);
      directionalLight.castShadow = true;
      directionalLight.shadow.camera.far = 20;
      directionalLight.shadow.mapSize.set(64, 64);
      directionalLight.shadow.normalBias = 0.05;
      directionalLight.position.set(-5, 5, -5);
      scene.add(directionalLight);

      const hemisphereLight = new THREE.HemisphereLight(COLORS.sky, COLORS.ground, 0.1);
      scene.add(hemisphereLight)

      // add grid helper
      const size = 10;
      const divisions = 10;
      const gridHelper = new THREE.GridHelper(size, divisions);
      scene.add(gridHelper);

      const orbit = new OrbitControls(camera, renderer.domElement);
      _orbit.current = orbit;
      //_orbit.current.autoRotate = true;
      _orbit.current.target = target;
      _orbit.current.enableDamping = true;

      let req = null;
      const animate = () => {
        req = requestAnimationFrame(animate);

        camera.lookAt(target);
        _camera.current = camera;
        _orbit.current.update();

        renderer.render(scene, camera);
      }

      animate();

      const control = new TransformControls(camera, renderer.domElement);
      //control.addEventListener('change', animate);
      control.addEventListener('dragging-changed', function (event) {
        _orbit.current.enabled = !event.value;
      });
      scene.add(control);
      _control.current = control;

      return () => {
        console.log('unmount')
        cancelAnimationFrame(req)
        renderer.dispose()
      }
    }
  }, []);

  // useEffect(() => {
  //   setFrame(frame => frame + 1);
  // }, [frame]);

  // raycaster for interactions
  // useEffect(() => {
  //   const raycaster = new THREE.Raycaster();
  //   raycaster.setFromCamera(_mouse, _camera);
  //   let _intersects = raycaster.intersectObjects(_objs);
  //   if (_intersects.length > 0) {
  //     console.log(_intersects[0]);
  //   }
  // }, [_mouse]);

  // if not intersected any more, set the objects' scales back to normal
  // useEffect(() => {
  //   if (_curIntersect != null) {
  //     gsap.to(_curIntersect.object.parent.parent.scale, { x: 1.2, y: 1.2, z: 1.2 });
  //   }
  //   if (_lastIntersect != null) {
  //     gsap.to(_lastIntersect.object.parent.parent.scale, { x: 1, y: 1, z: 1 });
  //   }
  // }, [frame]);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize, false);
    window.addEventListener('keydown', handleKeyDown, false);
    window.addEventListener('mousemove', handleMouseMove, false);
    window.addEventListener('mousedown', handleMouseDown, false);
    window.addEventListener('mouseup', handleMouseUp, false);
    window.addEventListener('click', handleMouseClick, false);
    return () => {
      window.removeEventListener('resize', handleWindowResize, false);
      window.removeEventListener('keydown', handleKeyDown, false);
      window.removeEventListener('mousemove', handleMouseMove, false);
      window.removeEventListener('mousedown', handleMouseDown, false);
      window.removeEventListener('mouseup', handleMouseUp, false);
      window.removeEventListener('click', handleMouseClick, false);
    }
  }, [renderer, handleWindowResize, handleMouseMove, handleMouseDown, handleMouseClick]);

  return (
    <div>
      <div className='add-functions'>
        {isDrawMode.current === false &&
          <div>
            <button onClick={addCube}>Add Cube</button>
            <br />
            <button onClick={addSphere}>Add Sphere</button>
            <br />
            <button onClick={addPlane}>Add Plane</button>
            <br />
            <button onClick={deleteShape}>Delete Shape</button>
            <br />
            <button onClick={deleteAllShapes}>Delete All Shapes</button>
            <br />
            <button onClick={deleteAllLines}>Delete All Lines</button>
            <br />
            <button onClick={startDrawMode}>Start Draw</button>
            <br />
          </div>
        }
        {isDrawMode.current === true &&
          <div>
            <button onClick={stopDrawMode}>Stop Draw</button>
          </div>
        }
      </div>
      <div className='control-functions'>
        {isDrawMode.current === false &&
          <div>
            <button onClick={() => changeControlType('translate')}>Translate</button>
            <br />
            <button onClick={() => changeControlType('rotate')}>Rotate</button>
            <br />
            <button onClick={() => changeControlType('scale')}>Scale</button>
            <br />
            <button onClick={disableControls}>Disable Controls</button>
          </div>
        }
        {/* {isDrawMode.current === true &&
          <div>
            <button onClick={startPenMode}>Pen</button>
            <button onClick={stopPenMode}>Eraser</button>
          </div>
        } */}
      </div>
      <div className="drawing-options">
        <p>Pen colors</p>
        <button className='button-black' onClick={() => setLineColor('black')} />
        <button className='button-red' onClick={() => setLineColor('red')} />
        <button className='button-green' onClick={() => setLineColor('green')} />
        <button className='button-blue' onClick={() => setLineColor('blue')} />
        <br />
        <div className='thickness-options'>
          <p>Pen thickness</p>
          <button onClick={() => setLineThickness('thin')}>Thin</button>
          <button onClick={() => setLineThickness('normal')}>Normal</button>
          <button onClick={() => setLineThickness('thick')}>Thick</button>
        </div>
      </div>
      <div className='main-canvas' ref={refContainer}></div>
    </div>
  );
};

export default BackDrop;