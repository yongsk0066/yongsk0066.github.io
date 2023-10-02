import * as THREE from 'three';

export function easeInOutCubic(x: number): number {
    return x ** 2 * 3 - x ** 3 * 2;
}

export function linearStep(x: number, edge0: number, edge1: number): number {
    const w = edge1 - edge0;
    const m = 1 / w;
    const y0 = -m * edge0;
    return THREE.MathUtils.clamp(y0 + m * x, 0, 1);
}

export function stopGoEased(x: number, downtime: number, period: number): number {
    const cycle = (x / period) | 0;
    const tween = x - cycle * period;
    const linStep = easeInOutCubic(linearStep(tween, downtime, period));
    return cycle + linStep;
}

export function pixelAlignFrustum(camera: THREE.Camera, aspectRatio: number, pixelsPerScreenWidth: number, pixelsPerScreenHeight: number) {
			// 0. Get Pixel Grid Units
			const worldScreenWidth = ( ( camera.right - camera.left ) / camera.zoom );
			const worldScreenHeight = ( ( camera.top - camera.bottom ) / camera.zoom );
			const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
			const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

			// 1. Project the current camera position along its local rotation bases
			const camPos = new THREE.Vector3(); camera.getWorldPosition( camPos );
			const camRot = new THREE.Quaternion(); camera.getWorldQuaternion( camRot );
			const camRight = new THREE.Vector3( 1.0, 0.0, 0.0 ).applyQuaternion( camRot );
			const camUp = new THREE.Vector3( 0.0, 1.0, 0.0 ).applyQuaternion( camRot );
			const camPosRight = camPos.dot( camRight );
			const camPosUp = camPos.dot( camUp );

			// 2. Find how far along its position is along these bases in pixel units
			const camPosRightPx = camPosRight / pixelWidth;
			const camPosUpPx = camPosUp / pixelHeight;

			// 3. Find the fractional pixel units and convert to world units
			const fractX = camPosRightPx - Math.round( camPosRightPx );
			const fractY = camPosUpPx - Math.round( camPosUpPx );

			// 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
			camera.left = - aspectRatio - ( fractX * pixelWidth );
			camera.right = aspectRatio - ( fractX * pixelWidth );
			camera.top = 1.0 - ( fractY * pixelHeight );
			camera.bottom = - 1.0 - ( fractY * pixelHeight );
			camera.updateProjectionMatrix();
}
