// Keep the ray traversal's contiguous triangle layout. Send shared vertices just once.
struct Triangle {
 a:vec4f, b:vec4f, c:vec4f,
 na:vec4f, nb:vec4f, nc:vec4f,
 uv01:vec4f, uv2:vec4f,
}
@group(0) @binding(0) var<storage,read> indices:array<u32>;
@group(0) @binding(1) var<storage,read> vertices:array<f32>;
@group(0) @binding(2) var<storage,read_write> triangles:array<Triangle>;

fn xyz(i:u32)->vec4f {return vec4f(vertices[i],vertices[i+1u],vertices[i+2u],0.);}
fn uv(i:u32)->vec2f {return vec2f(vertices[i],vertices[i+1u]);}

@compute @workgroup_size(64)
fn expand(@builtin(global_invocation_id) id:vec3u) {
 let t=id.x;
 if(t>=arrayLength(&triangles)){return;}
 let a=indices[3u*t];let b=indices[3u*t+1u];let c=indices[3u*t+2u];
 let count=arrayLength(&vertices)/8u;
 let normals=3u*count;let uvs=6u*count;
 triangles[t]=Triangle(xyz(3u*a),xyz(3u*b),xyz(3u*c),
   xyz(normals+3u*a),xyz(normals+3u*b),xyz(normals+3u*c),
   vec4f(uv(uvs+2u*a),uv(uvs+2u*b)),vec4f(uv(uvs+2u*c),0.,0.));
}
