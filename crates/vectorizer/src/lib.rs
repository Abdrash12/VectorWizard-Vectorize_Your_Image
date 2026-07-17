use wasm_bindgen::prelude::*;
use vtracer::{convert, Config, ColorMode, Hierarchical};
use visioncortex::{ColorImage, PathSimplifyMode};

#[wasm_bindgen]
pub fn trace_image(data: &[u8], width: u32, height: u32, preset: &str) -> Result<String, JsValue> {
    let color_image = ColorImage {
        pixels: data.to_vec(),
        width: width as usize,
        height: height as usize,
    };

    let mut config = Config::default();
    config.hierarchical = Hierarchical::Stacked; 

    match preset {
        "exact" => {
            // Pixel-perfect tracing; turns off smoothing and mathematical curves
            config.mode = PathSimplifyMode::None; 
            config.color_mode = ColorMode::Color;
            config.color_precision = 8;     // Highest standard color quantization 
            config.layer_difference = 0;    // Do not merge similar colors together
            config.filter_speckle = 0;      // Do not delete any small details
            config.length_threshold = 3.5;  
            config.corner_threshold = 0;    
        },
        "logo" => {
            // Documented defaults for standard smooth curves
            config.mode = PathSimplifyMode::Spline; 
            config.color_mode = ColorMode::Color;
            config.color_precision = 6;      
            config.layer_difference = 16;     
            config.filter_speckle = 4;       
            config.length_threshold = 4.0;   
            config.corner_threshold = 60;    
            config.splice_threshold = 45;    
            config.path_precision = Some(5); 
        },
        "anime" => {
            config.mode = PathSimplifyMode::Polygon; 
            config.color_mode = ColorMode::Color;
            config.color_precision = 6;      
            config.layer_difference = 16;    
            config.filter_speckle = 4;       
            config.length_threshold = 4.0;   
            config.corner_threshold = 60;    
            config.path_precision = Some(3); 
        },
        "photo" => {
            config.mode = PathSimplifyMode::Spline; 
            config.color_mode = ColorMode::Color;
            config.color_precision = 6;      
            config.layer_difference = 16;    
            config.filter_speckle = 10;      // High speckle filter removes camera grain
            config.length_threshold = 5.0;   
            config.corner_threshold = 60;    
            config.path_precision = Some(3); 
        },
        "bw" => {
            config.mode = PathSimplifyMode::Polygon; 
            config.color_mode = ColorMode::Binary;
            config.filter_speckle = 4;       
            config.corner_threshold = 60;    
            config.path_precision = Some(3); 
        },
        _ => {
            config.color_mode = ColorMode::Color;
        }
    }

    match convert(color_image, config) {
        Ok(svg) => Ok(svg.to_string()), 
        Err(e) => Err(JsValue::from_str(&format!("Vectorization failed: {:?}", e))),
    }
}