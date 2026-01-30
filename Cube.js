class Cube {
    constructor() {
        this.type = 'cube';
        // this.position = [0.0, 0.0, 0.0];
        this.color = [1.0,1.0,1.0,1.0];
        // this.size = 5.0;
        // this.segments = 10;
        this.matrix = new Matrix4();
    }

    render() {
        // var xy = this.position;
        var rgba = this.color;
        // var size = this.size;

        // Center the cube geometry so rotations happen around its middle (not a corner)
        // Cube vertices are defined in [0..1], so shift by (-0.5,-0.5,-0.5) in local space.
        var m = new Matrix4(this.matrix);
        m.translate(-0.5, -0.5, -0.5);
        gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);

        // Fake 3D "lighting" that CHANGES with camera angle (no shader lighting):
        // compute brightness from rotated face normal ⋅ lightDir.
        function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
        function len3(v) { return Math.sqrt(dot3(v,v)); }
        function norm3(v) { const l = len3(v) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }

        const ambient = 0.35;
        const light = (typeof g_lightDir !== 'undefined') ? norm3(g_lightDir) : [0.5, 1.0, -0.8];
        const grot = (typeof g_globalRotMat !== 'undefined') ? g_globalRotMat : null;

        function rotateNormal(n) {
            if (!grot) return n;
            // multiply vec4(n,0) by grot (Matrix4 is column-major)
            const e = grot.elements;
            return [
                e[0]*n[0] + e[4]*n[1] + e[8]*n[2],
                e[1]*n[0] + e[5]*n[1] + e[9]*n[2],
                e[2]*n[0] + e[6]*n[1] + e[10]*n[2],
            ];
        }

        function faceIntensity(localNormal) {
            const rn = norm3(rotateNormal(localNormal));
            const d = Math.max(0, dot3(rn, light));
            return ambient + (1 - ambient) * d;
        }

        function setC(mult) {
            gl.uniform4f(u_FragColor, rgba[0] * mult, rgba[1] * mult, rgba[2] * mult, rgba[3]);
        }

        // Helper: split a quad into 4 triangles around its center (more "faces")
        function drawQuad4(a, b, c, d, intensity) {
            const cx = (a[0] + b[0] + c[0] + d[0]) / 4.0;
            const cy = (a[1] + b[1] + c[1] + d[1]) / 4.0;
            const cz = (a[2] + b[2] + c[2] + d[2]) / 4.0;
            const center = [cx, cy, cz];
            // Slight per-triangle variation (fake lighting gradient)
            setC(intensity * 1.00); drawTriangle3D([a[0],a[1],a[2],  b[0],b[1],b[2],  center[0],center[1],center[2]]);
            setC(intensity * 0.96); drawTriangle3D([b[0],b[1],b[2],  c[0],c[1],c[2],  center[0],center[1],center[2]]);
            setC(intensity * 0.92); drawTriangle3D([c[0],c[1],c[2],  d[0],d[1],d[2],  center[0],center[1],center[2]]);
            setC(intensity * 0.96); drawTriangle3D([d[0],d[1],d[2],  a[0],a[1],a[2],  center[0],center[1],center[2]]);
        }

        // Define corners for each face (in [0..1] local cube space)
        // Front (z=0)
        drawQuad4([0,0,0],[1,0,0],[1,1,0],[0,1,0], faceIntensity([0,0,-1]));
        // Back (z=1)
        drawQuad4([0,0,1],[0,1,1],[1,1,1],[1,0,1], faceIntensity([0,0, 1]));
        // Left (x=0)
        drawQuad4([0,0,0],[0,0,1],[0,1,1],[0,1,0], faceIntensity([-1,0,0]));
        // Right (x=1)
        drawQuad4([1,0,0],[1,1,0],[1,1,1],[1,0,1], faceIntensity([ 1,0,0]));
        // Top (y=1)
        drawQuad4([0,1,0],[0,1,1],[1,1,1],[1,1,0], faceIntensity([0, 1,0]));
        // Bottom (y=0)
        drawQuad4([0,0,0],[1,0,0],[1,0,1],[0,0,1], faceIntensity([0,-1,0]));
    }
}
