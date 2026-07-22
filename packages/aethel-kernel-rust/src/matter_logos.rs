// Logos da Matéria (A Gramática da Ação)
// As IAs atuais criam geometrias "mortas". No Aethel, se a geometria tem a forma 
// de uma Dobradiça (Hinge), a física de rotação é ativada automaticamente.

pub struct MatterLogos;

pub enum ActionGrammar {
    StaticInert,
    RotationalJoint { axis: [f32; 3], torque: f32 },
    FluidDynamic,
    LeverMechanism { fulcrum: [f32; 3] },
}

impl MatterLogos {
    /// O Maestro (IA) infere a intenção semântica. O Kernel traduz a forma em Mecânica.
    pub fn assign_grammar_to_shape(semantic_tag: &str, density: f32) -> ActionGrammar {
        match semantic_tag {
            "door" | "hinge" | "wheel" => {
                // A geometria não é mais só um desenho, ela sabe que roda.
                ActionGrammar::RotationalJoint {
                    axis: [0.0, 1.0, 0.0],
                    torque: density * 1.5,
                }
            },
            "lever" | "catapult" => {
                ActionGrammar::LeverMechanism {
                    fulcrum: [0.0, 0.0, 0.0], // Seria derivado do SDF
                }
            },
            "water" | "lava" => ActionGrammar::FluidDynamic,
            _ => ActionGrammar::StaticInert,
        }
    }
}
