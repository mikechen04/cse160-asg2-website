class Cylinder {
    constructor() {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.segments = 20; // Number of segments around the cylinder
    }

    render() {
        var rgba = this.color;
        var m = new Matrix4(this.matrix);
        m.translate(-0.5, -0.5, -0.5);
        gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);

        // Set color
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        var segments = this.segments;
        var vertices = [];

        // Generate cylinder vertices
        // Top and bottom circles
        for (var i = 0; i <= segments; i++) {
            var angle = (i * 360 / segments) * Math.PI / 180;
            var x = 0.5 + 0.5 * Math.cos(angle);
            var z = 0.5 + 0.5 * Math.sin(angle);
            
            // Top circle (y = 1)
            vertices.push(x, 1.0, z);
            // Bottom circle (y = 0)
            vertices.push(x, 0.0, z);
        }

        // Draw top cap
        for (var i = 0; i < segments; i++) {
            var idx1 = i * 2;
            var idx2 = (i + 1) * 2;
            drawTriangle3D([
                vertices[idx1*3], vertices[idx1*3+1], vertices[idx1*3+2],
                0.5, 1.0, 0.5,
                vertices[idx2*3], vertices[idx2*3+1], vertices[idx2*3+2]
            ]);
        }

        // Draw bottom cap
        for (var i = 0; i < segments; i++) {
            var idx1 = i * 2 + 1;
            var idx2 = (i + 1) * 2 + 1;
            drawTriangle3D([
                vertices[idx1*3], vertices[idx1*3+1], vertices[idx1*3+2],
                0.5, 0.0, 0.5,
                vertices[idx2*3], vertices[idx2*3+1], vertices[idx2*3+2]
            ]);
        }

        // Draw side faces (quads as triangles)
        for (var i = 0; i < segments; i++) {
            var top1 = i * 2;
            var top2 = (i + 1) * 2;
            var bot1 = i * 2 + 1;
            var bot2 = (i + 1) * 2 + 1;
            
            // First triangle
            drawTriangle3D([
                vertices[top1*3], vertices[top1*3+1], vertices[top1*3+2],
                vertices[bot1*3], vertices[bot1*3+1], vertices[bot1*3+2],
                vertices[top2*3], vertices[top2*3+1], vertices[top2*3+2]
            ]);
            
            // Second triangle
            drawTriangle3D([
                vertices[bot1*3], vertices[bot1*3+1], vertices[bot1*3+2],
                vertices[bot2*3], vertices[bot2*3+1], vertices[bot2*3+2],
                vertices[top2*3], vertices[top2*3+1], vertices[top2*3+2]
            ]);
        }
    }
}
