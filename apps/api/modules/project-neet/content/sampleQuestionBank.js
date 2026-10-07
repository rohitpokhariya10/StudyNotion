// ORIGINAL SAMPLE CONTENT FOR DEVELOPMENT AND DEMONSTRATION ONLY.
//
// Every question here was written for StudyNotion's Project NEET module. None
// is copied from NTA papers or from any coaching institute's material. The
// content has not been reviewed by subject-matter experts and must not be
// presented as academically validated preparation material.
//
// Numerical items are generated from templates whose answers are computed, so
// their keys are correct by construction. Conceptual items state standard
// textbook facts in original wording.
//
// Inline markup: _{...} renders as subscript and ^{...} as superscript.

const { seededShuffle } = require("../domain/paper")

const KEYS = ["A", "B", "C", "D"]

const format = (value) => {
  if (!Number.isFinite(value)) throw new Error("Non-finite sample value")
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

// Authored item: options listed in display order with the correct key.
const authored = (topic, text, options, correct) => ({
  topic,
  text,
  options,
  correct,
})

// Generated item: the correct value is always computed by the caller and the
// option order is shuffled deterministically from the seed.
const generated = (topic, text, correctText, distractors, seed, media) => {
  const values = [correctText, ...distractors]
  if (new Set(values).size !== values.length) {
    throw new Error(`Sample item "${seed}" has duplicate options`)
  }
  const shuffled = seededShuffle(values, seed)
  return {
    topic,
    text,
    options: shuffled,
    correct: KEYS[shuffled.indexOf(correctText)],
    ...(media ? { media } : {}),
  }
}

// Builds one distinct question per fact-table row. Distractors come from the
// other rows' answers, so every option is a plausible, real term.
const fromTable = ({ prefix, rows, stem, topic }) =>
  rows.map((row, index) => {
    const pool = rows
      .filter((_candidate, candidateIndex) => candidateIndex !== index)
      .map((candidate) => candidate[1])
      .filter((answer) => answer !== row[1])
    const distractors = [
      ...new Set(seededShuffle(pool, `${prefix}:${index}:d`)),
    ].slice(0, 3)
    return generated(
      topic,
      stem(row[0]),
      row[1],
      distractors,
      `${prefix}:${index}`
    )
  })

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

const physicsAuthored = [
  authored(
    "Motion in a straight line",
    "A body moves along a straight line with constant velocity. Which quantity is necessarily zero for this body?",
    ["Displacement", "Acceleration", "Speed", "Linear momentum"],
    "B"
  ),
  authored(
    "Units and measurement",
    "The dimensional formula of Planck's constant is the same as that of",
    ["energy", "linear momentum", "angular momentum", "power"],
    "C"
  ),
  authored(
    "Alternating current",
    "In an ideal step-up transformer, which quantity is larger in the secondary coil than in the primary coil?",
    ["Power", "Frequency", "Current", "Voltage"],
    "D"
  ),
  authored(
    "Electromagnetic waves",
    "Which of the following electromagnetic radiations has the longest wavelength?",
    ["Microwaves", "X-rays", "Ultraviolet rays", "Visible light"],
    "A"
  ),
  authored(
    "Ray optics",
    "When a narrow beam of white light passes through a glass prism, which colour is deviated the most?",
    ["Red", "Yellow", "Violet", "Green"],
    "C"
  ),
  authored(
    "Electromagnetic induction",
    "The SI unit of magnetic flux is the",
    ["tesla", "weber", "henry", "gauss"],
    "B"
  ),
  authored(
    "Semiconductor electronics",
    "An ideal p–n junction diode under forward bias offers",
    [
      "a very high resistance",
      "a resistance that does not depend on voltage",
      "an infinite resistance",
      "a low resistance",
    ],
    "D"
  ),
  authored(
    "Gravitation",
    "For a satellite orbiting very close to the Earth's surface, the orbital speed is approximately",
    ["3.1 km s^{-1}", "7.9 km s^{-1}", "11.2 km s^{-1}", "25 km s^{-1}"],
    "B"
  ),
  authored(
    "Work, energy and power",
    "The work done by the centripetal force on a body in uniform circular motion during one complete revolution is",
    ["zero", "positive", "negative", "dependent on the radius"],
    "A"
  ),
  authored(
    "Rotational motion",
    "Which of the following is a vector quantity?",
    ["Work", "Electric current", "Pressure", "Torque"],
    "D"
  ),
  authored(
    "Wave optics",
    "In Young's double-slit experiment, if the separation between the slits is doubled while all other conditions remain unchanged, the fringe width",
    ["doubles", "is halved", "remains unchanged", "becomes four times"],
    "B"
  ),
  authored(
    "Nuclei",
    "The half-life of a radioactive sample is T. The fraction of the original nuclei that remains undecayed after a time 3T is",
    ["1/3", "1/6", "1/8", "1/9"],
    "C"
  ),
  authored(
    "Current electricity",
    "When two resistors are connected in parallel, their equivalent resistance is",
    [
      "greater than the larger resistance",
      "smaller than the smaller resistance",
      "between the two resistances",
      "equal to their sum",
    ],
    "B"
  ),
  authored(
    "Thermodynamics",
    "In an adiabatic process, which of the following is zero?",
    [
      "Heat exchanged with the surroundings",
      "Work done by the gas",
      "Change in internal energy",
      "Change in temperature",
    ],
    "A"
  ),
  authored(
    "Moving charges and magnetism",
    "A charged particle moves parallel to a uniform magnetic field. The magnetic force acting on it is",
    [
      "maximum",
      "directed along the field",
      "directed opposite to the field",
      "zero",
    ],
    "D"
  ),
  authored(
    "Ray optics",
    "The working of an optical fibre is based on",
    ["dispersion", "diffraction", "total internal reflection", "polarisation"],
    "C"
  ),
  authored(
    "Semiconductor electronics",
    "Which logic gate gives an output of 1 only when both of its inputs are 1?",
    ["OR", "AND", "NOR", "XOR"],
    "B"
  ),
]

const physicsGenerated = () => {
  const items = []
  const figures = []
  // Diagram-based items exercise question media rendering.
  figures.push(
    generated(
      "Current electricity",
      "In the circuit shown, the 6 Ω and 3 Ω resistors are in parallel and that combination is in series with the 4 Ω resistor. The equivalent resistance between points A and B is",
      "6 Ω",
      ["13 Ω", "2 Ω", "4.33 Ω"],
      "phy-circuit-figure",
      [
        {
          kind: "image",
          url: "/project-neet/media/physics-circuit-01.svg",
          alt: "Circuit diagram: from point A a 4 ohm resistor leads to a junction that splits into a 6 ohm and a 3 ohm resistor in parallel, which rejoin before point B.",
          width: 520,
          height: 220,
        },
      ]
    )
  )
  figures.push(
    generated(
      "Motion in a straight line",
      "The velocity–time graph of a body moving in a straight line is shown. The displacement of the body in the first 10 s is",
      "100 m",
      ["200 m", "20 m", "50 m"],
      "phy-vt-figure",
      [
        {
          kind: "image",
          url: "/project-neet/media/physics-vt-graph-01.svg",
          alt: "Velocity–time graph: a straight line rising from 0 metres per second at time 0 to 20 metres per second at 10 seconds.",
          width: 480,
          height: 300,
        },
      ]
    )
  )

  for (const [a, t] of [
    [2, 5],
    [4, 3],
  ]) {
    const s = 0.5 * a * t * t
    items.push(
      generated(
        "Motion in a straight line",
        `A car starts from rest and accelerates uniformly at ${a} m s^{-2} for ${t} s. The distance it covers in this time is`,
        `${format(s)} m`,
        [`${format(a * t * t)} m`, `${format(a * t)} m`, `${format(s / 2)} m`],
        `phy-kin-${a}-${t}`
      )
    )
  }

  for (const [r1, r2, v] of [
    [4, 8, 24],
    [5, 15, 10],
  ]) {
    const current = v / (r1 + r2)
    items.push(
      generated(
        "Current electricity",
        `Resistors of ${r1} Ω and ${r2} Ω are connected in series across an ideal ${v} V battery. The current drawn from the battery is`,
        `${format(current)} A`,
        [
          `${format(v / r1)} A`,
          `${format(v / r2)} A`,
          `${format(v / ((r1 * r2) / (r1 + r2)))} A`,
        ],
        `phy-series-${r1}-${r2}-${v}`
      )
    )
  }

  for (const [r1, r2] of [
    [6, 3],
    [12, 6],
  ]) {
    const equivalent = (r1 * r2) / (r1 + r2)
    items.push(
      generated(
        "Current electricity",
        `Two resistors of ${r1} Ω and ${r2} Ω are connected in parallel. Their equivalent resistance is`,
        `${format(equivalent)} Ω`,
        [
          `${format(r1 + r2)} Ω`,
          `${format((r1 + r2) / 2)} Ω`,
          `${format(Math.abs(r1 - r2))} Ω`,
        ],
        `phy-parallel-${r1}-${r2}`
      )
    )
  }

  for (const [f, u] of [
    [10, 30],
    [20, 60],
  ]) {
    const v = (f * u) / (u - f)
    items.push(
      generated(
        "Ray optics",
        `An object is placed ${u} cm in front of a thin convex lens of focal length ${f} cm. The distance of the real image from the lens is`,
        `${format(v)} cm`,
        [
          `${format((f * u) / (u + f))} cm`,
          `${format(u - f)} cm`,
          `${format(2 * v)} cm`,
        ],
        `phy-lens-${f}-${u}`
      )
    )
  }

  for (const [m, v] of [
    [2, 10],
    [4, 5],
  ]) {
    const kinetic = 0.5 * m * v * v
    items.push(
      generated(
        "Work, energy and power",
        `The kinetic energy of a body of mass ${m} kg moving with a speed of ${v} m s^{-1} is`,
        `${format(kinetic)} J`,
        [
          `${format(m * v * v)} J`,
          `${format(m * v)} J`,
          `${format(kinetic / 2)} J`,
        ],
        `phy-ke-${m}-${v}`
      )
    )
  }

  for (const u of [20, 30]) {
    const range = (u * u) / 10
    items.push(
      generated(
        "Motion in a plane",
        `A ball is projected from level ground at 45° to the horizontal with a speed of ${u} m s^{-1}. Taking g = 10 m s^{-2} and ignoring air resistance, its horizontal range is`,
        `${format(range)} m`,
        [
          `${format(range / 2)} m`,
          `${format(range * 2)} m`,
          `${format(range / 4)} m`,
        ],
        `phy-range-${u}`
      )
    )
  }

  for (const [m1, v, m2] of [
    [2, 6, 1],
    [3, 8, 5],
  ]) {
    const final = (m1 * v) / (m1 + m2)
    items.push(
      generated(
        "Laws of motion",
        `A ${m1} kg block moving at ${v} m s^{-1} on a frictionless surface collides with and sticks to a stationary ${m2} kg block. Their common speed just after the collision is`,
        `${format(final)} m s^{-1}`,
        [
          `${format(v)} m s^{-1}`,
          `${format((m2 * v) / (m1 + m2))} m s^{-1}`,
          `${format(v / 2 === final ? v / 3 : v / 2)} m s^{-1}`,
        ],
        `phy-momentum-${m1}-${v}-${m2}`
      )
    )
  }

  for (const [m, h, t] of [
    [50, 10, 20],
    [20, 15, 6],
  ]) {
    const power = (m * 10 * h) / t
    items.push(
      generated(
        "Work, energy and power",
        `A motor lifts a ${m} kg load vertically through ${h} m at constant speed in ${t} s. Taking g = 10 m s^{-2}, the useful power delivered is`,
        `${format(power)} W`,
        [
          `${format(power * 2)} W`,
          `${format((m * h) / t)} W`,
          `${format(m * 10 * h)} W`,
        ],
        `phy-power-${m}-${h}-${t}`
      )
    )
  }

  for (const [f, lambda] of [
    [500, 0.68],
    [256, 1.3],
  ]) {
    const speed = f * lambda
    items.push(
      generated(
        "Waves",
        `A sound wave of frequency ${f} Hz has a wavelength of ${lambda} m in air. The speed of sound in air is`,
        `${format(speed)} m s^{-1}`,
        [
          `${format(f / lambda)} m s^{-1}`,
          `${format(speed / 2)} m s^{-1}`,
          `${format(speed * 2)} m s^{-1}`,
        ],
        `phy-wave-${f}-${lambda}`
      )
    )
  }

  for (const [c, v] of [
    [10, 100],
    [4, 50],
  ]) {
    const energy = 0.5 * c * 1e-6 * v * v * 1000
    items.push(
      generated(
        "Electrostatic potential and capacitance",
        `A ${c} μF capacitor is charged to a potential difference of ${v} V. The energy stored in it is`,
        `${format(energy)} mJ`,
        [
          `${format(energy * 2)} mJ`,
          `${format(energy / 2)} mJ`,
          `${format(energy * 10)} mJ`,
        ],
        `phy-cap-${c}-${v}`
      )
    )
  }

  for (const [m, dt] of [
    [2, 10],
    [0.5, 20],
  ]) {
    const heat = (m * 4200 * dt) / 1000
    items.push(
      generated(
        "Thermal properties of matter",
        `How much heat is needed to raise the temperature of ${m} kg of water by ${dt} °C? (Specific heat capacity of water = 4200 J kg^{-1} K^{-1})`,
        `${format(heat)} kJ`,
        [
          `${format(heat * 2)} kJ`,
          `${format(heat / 2)} kJ`,
          `${format(heat / 4.2)} kJ`,
        ],
        `phy-heat-${m}-${dt}`
      )
    )
  }

  for (const h of [5, 12]) {
    const pressure = 1000 * 10 * h
    items.push(
      generated(
        "Mechanical properties of fluids",
        `The pressure due to a ${h} m column of water (density 1000 kg m^{-3}, g = 10 m s^{-2}), excluding atmospheric pressure, is`,
        `${format(pressure / 1000)} kPa`,
        [
          `${format(pressure / 100)} kPa`,
          `${format(pressure / 10000)} kPa`,
          `${format((pressure * 2) / 1000)} kPa`,
        ],
        `phy-pressure-${h}`
      )
    )
  }

  for (const k of [4, 9]) {
    items.push(
      generated(
        "Oscillations",
        `If the length of a simple pendulum is made ${k} times its original value, its time period becomes`,
        `${format(Math.sqrt(k))} times`,
        [
          `${format(k)} times`,
          `${format(k * k)} times`,
          `${format(1 / Math.sqrt(k))} times`,
        ],
        `phy-pendulum-${k}`
      )
    )
  }

  for (const [n, q] of [
    [4, 2],
    [6, 3],
  ]) {
    const total = n * q
    items.push(
      generated(
        "Electric charges and fields",
        `A conductor carries a steady current of ${n} A. The charge that flows through any cross-section in ${q} s is`,
        `${format(total)} C`,
        [`${format(n / q)} C`, `${format(n + q)} C`, `${format(total * 2)} C`],
        `phy-charge-${n}-${q}`
      )
    )
  }

  for (const [v, r] of [
    [220, 110],
    [12, 4],
  ]) {
    const power = (v * v) / r
    items.push(
      generated(
        "Current electricity",
        `A ${r} Ω resistor is connected across a ${v} V supply. The power dissipated in it is`,
        `${format(power)} W`,
        [`${format(v * r)} W`, `${format(v / r)} W`, `${format(power / 2)} W`],
        `phy-joule-${v}-${r}`
      )
    )
  }

  // Interleave the diagram items early so short mocks include them.
  return [figures[0], items[0], figures[1], ...items.slice(1)]
}

// ---------------------------------------------------------------------------
// Chemistry
// ---------------------------------------------------------------------------

const chemistryAuthored = [
  authored(
    "Classification of elements and periodicity",
    "Which of the following elements has the highest first ionisation enthalpy?",
    ["Na", "Mg", "O", "N"],
    "D"
  ),
  authored(
    "Chemical bonding",
    "The hybridisation of the carbon atom in methane (CH_{4}) is",
    ["sp", "sp^{2}", "sp^{3}", "sp^{3}d"],
    "C"
  ),
  authored(
    "Hydrogen",
    "Which gas is evolved when granulated zinc reacts with dilute hydrochloric acid?",
    ["Hydrogen", "Chlorine", "Oxygen", "Hydrogen chloride"],
    "A"
  ),
  authored(
    "Redox reactions",
    "The oxidation number of chromium in K_{2}Cr_{2}O_{7} is",
    ["+3", "+6", "+4", "+7"],
    "B"
  ),
  authored(
    "Equilibrium",
    "Which of the following species can act as a Lewis acid?",
    ["NH_{3}", "H_{2}O", "BF_{3}", "Cl^{−}"],
    "C"
  ),
  authored(
    "Structure of atom",
    "Which quantum number determines the shape of an atomic orbital?",
    [
      "Principal quantum number",
      "Magnetic quantum number",
      "Spin quantum number",
      "Azimuthal quantum number",
    ],
    "D"
  ),
  authored(
    "Aldehydes and ketones",
    "Which reagent can be used to distinguish an aliphatic aldehyde from a ketone?",
    [
      "Tollens' reagent",
      "Lucas reagent",
      "Hinsberg reagent",
      "Baeyer's reagent",
    ],
    "A"
  ),
  authored(
    "Carboxylic acids",
    "Which of the following is the strongest acid?",
    ["CH_{3}COOH", "ClCH_{2}COOH", "Cl_{2}CHCOOH", "Cl_{3}CCOOH"],
    "D"
  ),
  authored(
    "Solutions",
    "Which colligative property is most suitable for determining the molar mass of a protein?",
    [
      "Relative lowering of vapour pressure",
      "Osmotic pressure",
      "Elevation of boiling point",
      "Depression of freezing point",
    ],
    "B"
  ),
  authored(
    "Equilibrium",
    "For the exothermic equilibrium 2SO_{2}(g) + O_{2}(g) ⇌ 2SO_{3}(g), increasing the total pressure at constant temperature",
    [
      "shifts the equilibrium towards SO_{3}",
      "shifts the equilibrium towards SO_{2}",
      "has no effect on the equilibrium",
      "changes the equilibrium constant",
    ],
    "A"
  ),
  authored(
    "Organic chemistry: basic principles",
    "The IUPAC name of CH_{3}–CH(CH_{3})–CH_{3} is",
    ["butane", "1-methylpropane", "2-methylpropane", "isobutene"],
    "C"
  ),
  authored(
    "Classification of elements and periodicity",
    "Which of the following elements is a metalloid?",
    ["Sodium", "Silicon", "Sulphur", "Chlorine"],
    "B"
  ),
  authored(
    "Chemical kinetics",
    "A catalyst increases the rate of a chemical reaction mainly by",
    [
      "increasing the equilibrium constant",
      "increasing the enthalpy of reaction",
      "providing a pathway with lower activation energy",
      "increasing the concentration of reactants",
    ],
    "C"
  ),
  authored(
    "Hydrocarbons",
    "Benzene most commonly undergoes",
    [
      "nucleophilic addition",
      "electrophilic substitution",
      "free-radical addition",
      "nucleophilic substitution",
    ],
    "B"
  ),
  authored(
    "Coordination compounds",
    "The geometry of the complex [Ni(CO)_{4}] is",
    ["square planar", "octahedral", "linear", "tetrahedral"],
    "D"
  ),
  authored(
    "Some basic concepts of chemistry",
    "The number of moles present in 22 g of carbon dioxide (molar mass 44 g mol^{-1}) is",
    ["0.5", "2", "1", "0.25"],
    "A"
  ),
  authored(
    "Biomolecules",
    "The monomer units of proteins are",
    ["nucleotides", "monosaccharides", "amino acids", "fatty acids"],
    "C"
  ),
]

const chemistryGenerated = () => {
  const items = []

  for (const [name, formula, molar, mass] of [
    ["water", "H_{2}O", 18, 36],
    ["sodium hydroxide", "NaOH", 40, 10],
    ["calcium carbonate", "CaCO_{3}", 100, 25],
  ]) {
    const moles = mass / molar
    items.push(
      generated(
        "Some basic concepts of chemistry",
        `How many moles are present in ${mass} g of ${name} (${formula}, molar mass ${molar} g mol^{-1})?`,
        format(moles),
        [format(moles * 2), format(moles / 2), format(molar / mass)],
        `chem-moles-${formula}-${mass}`
      )
    )
  }

  for (const [grams, volume] of [
    [4, 500],
    [2, 100],
  ]) {
    const molarity = grams / 40 / (volume / 1000)
    items.push(
      generated(
        "Solutions",
        `${grams} g of NaOH (molar mass 40 g mol^{-1}) is dissolved in water to make ${volume} mL of solution. The molarity of the solution is`,
        `${format(molarity)} M`,
        [
          `${format(molarity * 2)} M`,
          `${format(molarity / 2)} M`,
          `${format(molarity * 10)} M`,
        ],
        `chem-molarity-${grams}-${volume}`
      )
    )
  }

  for (const [label, concentration, ph] of [
    ["HCl", "0.01", 2],
    ["HCl", "0.001", 3],
    ["NaOH", "0.01", 12],
  ]) {
    items.push(
      generated(
        "Equilibrium",
        `The pH of a ${concentration} M aqueous solution of ${label} at 298 K (assuming complete dissociation) is`,
        String(ph),
        [
          String(14 - ph),
          String(ph + 1),
          String(ph - 1 === 14 - ph ? ph + 2 : ph - 1),
        ],
        `chem-ph-${label}-${concentration}`
      )
    )
  }

  for (const k of [0.0693, 0.231]) {
    const halfLife = 0.693 / k
    items.push(
      generated(
        "Chemical kinetics",
        `The rate constant of a first-order reaction is ${k} min^{-1}. Its half-life is`,
        `${format(halfLife)} min`,
        [
          `${format(halfLife * 2)} min`,
          `${format(halfLife / 2)} min`,
          `${format(1 / k)} min`,
        ],
        `chem-halflife-${k}`
      )
    )
  }

  for (const [label, correct, distractors] of [
    [
      "2",
      "1.204 × 10^{24}",
      ["6.022 × 10^{23}", "3.011 × 10^{23}", "2.408 × 10^{24}"],
    ],
    [
      "0.5",
      "3.011 × 10^{23}",
      ["6.022 × 10^{23}", "1.204 × 10^{24}", "1.506 × 10^{23}"],
    ],
  ]) {
    items.push(
      generated(
        "Some basic concepts of chemistry",
        `The number of molecules in ${label} mol of oxygen gas (N_{A} = 6.022 × 10^{23} mol^{-1}) is`,
        correct,
        distractors,
        `chem-avogadro-${label}`
      )
    )
  }

  items.push(
    ...fromTable({
      prefix: "chem-oxidation",
      topic: "Redox reactions",
      stem: (subject) =>
        `The oxidation number of the element shown in brackets for ${subject} is`,
      rows: [
        ["KMnO_{4} (Mn)", "+7"],
        ["H_{2}SO_{4} (S)", "+6"],
        ["HNO_{3} (N)", "+5"],
        ["NH_{3} (N)", "−3"],
        ["Fe_{2}O_{3} (Fe)", "+3"],
      ],
    })
  )

  items.push(
    ...fromTable({
      prefix: "chem-functional-group",
      topic: "Organic chemistry: basic principles",
      stem: (compound) => `The functional group present in ${compound} is`,
      rows: [
        ["ethanol", "hydroxyl group"],
        ["ethanal", "aldehyde group"],
        ["propanone", "ketone group"],
        ["ethanoic acid", "carboxylic acid group"],
      ],
    })
  )

  for (const [m1, v1, v2] of [
    [2, 50, 200],
    [1, 100, 400],
  ]) {
    const m2 = (m1 * v1) / v2
    items.push(
      generated(
        "Solutions",
        `${v1} mL of a ${m1} M solution is diluted with water to a final volume of ${v2} mL. The molarity of the diluted solution is`,
        `${format(m2)} M`,
        [`${format(m2 * 2)} M`, `${format(m1)} M`, `${format(m2 / 2)} M`],
        `chem-dilution-${m1}-${v1}-${v2}`
      )
    )
  }

  items.push(
    ...fromTable({
      prefix: "chem-hybridisation",
      topic: "Chemical bonding",
      stem: (molecule) =>
        `The hybridisation of the central atom in ${molecule} is`,
      rows: [
        ["BeCl_{2}", "sp"],
        ["BF_{3}", "sp^{2}"],
        ["PCl_{5}", "sp^{3}d"],
        ["SF_{6}", "sp^{3}d^{2}"],
      ],
    }).slice(0, 3)
  )

  items.push(
    ...fromTable({
      prefix: "chem-shape",
      topic: "Chemical bonding",
      stem: (molecule) => `The shape of the ${molecule} molecule is`,
      rows: [
        ["CO_{2}", "linear"],
        ["H_{2}O", "bent"],
        ["NH_{3}", "trigonal pyramidal"],
        ["BF_{3}", "trigonal planar"],
      ],
    }).slice(0, 2)
  )

  return items
}

// ---------------------------------------------------------------------------
// Botany
// ---------------------------------------------------------------------------

const botanyAuthored = [
  authored(
    "Photosynthesis in higher plants",
    "The light reactions of photosynthesis take place in the",
    ["stroma", "thylakoid membranes", "cytoplasm", "mitochondrial matrix"],
    "B"
  ),
  authored(
    "Photosynthesis in higher plants",
    "The first stable product of carbon dioxide fixation in C_{4} plants is",
    [
      "3-phosphoglyceric acid",
      "ribulose bisphosphate",
      "oxaloacetic acid",
      "pyruvic acid",
    ],
    "C"
  ),
  authored(
    "Plant growth and development",
    "Which plant hormone promotes the closure of stomata during water stress?",
    ["Abscisic acid", "Auxin", "Gibberellin", "Cytokinin"],
    "A"
  ),
  authored(
    "Sexual reproduction in flowering plants",
    "Double fertilisation is a characteristic feature of",
    ["gymnosperms", "pteridophytes", "bryophytes", "angiosperms"],
    "D"
  ),
  authored(
    "Sexual reproduction in flowering plants",
    "In most flowering plants, the endosperm is",
    ["haploid", "diploid", "triploid", "tetraploid"],
    "C"
  ),
  authored(
    "Anatomy of flowering plants",
    "Casparian strips are present in the",
    ["epidermis", "endodermis", "pericycle", "cortex"],
    "B"
  ),
  authored(
    "Anatomy of flowering plants",
    "Secondary growth that increases the girth of dicot stems is mainly due to the activity of the",
    [
      "apical meristem",
      "intercalary meristem",
      "vascular cambium",
      "protoderm",
    ],
    "C"
  ),
  authored(
    "Mineral nutrition",
    "Biological nitrogen fixation in the root nodules of leguminous plants is carried out by",
    ["Rhizobium", "Nitrosomonas", "Nitrobacter", "Pseudomonas"],
    "A"
  ),
  authored(
    "Photosynthesis in higher plants",
    "The enzyme that fixes carbon dioxide in the Calvin cycle is",
    ["PEP carboxylase", "carbonic anhydrase", "hexokinase", "RuBisCO"],
    "D"
  ),
  authored(
    "Plant growth and development",
    "Gibberellins were first identified while studying",
    [
      "the 'foolish seedling' disease of rice",
      "the wilting of tomato plants",
      "the rusting of wheat",
      "the ripening of bananas",
    ],
    "A"
  ),
  authored(
    "Photosynthesis in higher plants",
    "'Kranz anatomy' refers to the arrangement of",
    [
      "guard cells around stomata",
      "bundle sheath cells around vascular bundles",
      "palisade cells in the upper epidermis",
      "xylem vessels in the root",
    ],
    "B"
  ),
  authored(
    "Principles of inheritance and variation",
    "In a dihybrid cross between two pure-breeding parents, the phenotypic ratio obtained in the F_{2} generation is",
    ["3 : 1", "1 : 2 : 1", "9 : 3 : 3 : 1", "1 : 1 : 1 : 1"],
    "C"
  ),
  authored(
    "Morphology of flowering plants",
    "Which of the following is a monocotyledonous plant?",
    ["Pea", "Mustard", "Sunflower", "Maize"],
    "D"
  ),
  authored(
    "Transport in plants",
    "The loss of water in the form of vapour from the aerial parts of a plant, mainly through stomata, is called",
    ["guttation", "transpiration", "imbibition", "plasmolysis"],
    "B"
  ),
  authored(
    "Cell cycle and cell division",
    "A single meiotic division cycle of a diploid cell normally produces",
    [
      "two diploid cells",
      "two haploid cells",
      "four diploid cells",
      "four haploid cells",
    ],
    "D"
  ),
  authored(
    "Photosynthesis in higher plants",
    "The reaction centre of photosystem I is",
    ["P680", "P700", "P870", "P960"],
    "B"
  ),
  authored(
    "Molecular basis of inheritance",
    "In DNA, adenine pairs with",
    ["thymine", "guanine", "cytosine", "uracil"],
    "A"
  ),
]

const botanyGenerated = () => [
  ...fromTable({
    prefix: "bot-hormone",
    topic: "Plant growth and development",
    stem: (effect) =>
      `Which plant growth regulator is chiefly associated with ${effect}?`,
    rows: [
      ["apical dominance", "Auxin"],
      ["bolting in rosette plants", "Gibberellin"],
      ["delaying leaf senescence", "Cytokinin"],
      ["the ripening of fruits", "Ethylene"],
      ["inducing seed dormancy", "Abscisic acid"],
    ],
  }),
  ...fromTable({
    prefix: "bot-organelle",
    topic: "Cell: the unit of life",
    stem: (role) => `The cell organelle chiefly responsible for ${role} is the`,
    rows: [
      ["protein synthesis", "ribosome"],
      ["aerobic respiration and ATP production", "mitochondrion"],
      ["photosynthesis", "chloroplast"],
      ["packaging and secretion of cell products", "Golgi apparatus"],
      ["intracellular digestion by hydrolytic enzymes", "lysosome"],
    ],
  }),
  ...fromTable({
    prefix: "bot-family",
    topic: "Morphology of flowering plants",
    stem: (plant) => `${plant} belongs to the family`,
    rows: [
      ["Pea (Pisum sativum)", "Fabaceae"],
      ["Potato (Solanum tuberosum)", "Solanaceae"],
      ["Onion (Allium cepa)", "Liliaceae"],
      ["Wheat (Triticum aestivum)", "Poaceae"],
    ],
  }),
  ...fromTable({
    prefix: "bot-mineral",
    topic: "Mineral nutrition",
    stem: (role) => `Which mineral element ${role}?`,
    rows: [
      ["is a constituent of the chlorophyll molecule", "Magnesium"],
      ["is a component of the enzyme nitrogenase", "Molybdenum"],
      ["is needed for the synthesis of auxin", "Zinc"],
      ["is a constituent of all proteins and nucleic acids", "Nitrogen"],
    ],
  }).slice(0, 3),
  ...fromTable({
    prefix: "bot-scientist",
    topic: "The living world and biological classification",
    stem: (contribution) => `${contribution} was proposed by`,
    rows: [
      ["The five-kingdom classification", "R. H. Whittaker"],
      ["The system of binomial nomenclature", "Carolus Linnaeus"],
      ["The laws of inheritance based on pea experiments", "Gregor Mendel"],
      ["The double-helix model of DNA", "Watson and Crick"],
    ],
  }),
  ...fromTable({
    prefix: "bot-genetics",
    topic: "Principles of inheritance and variation",
    stem: (cross) => `The expected ratio for ${cross} is`,
    rows: [
      ["the genotypes in the F_{2} of a monohybrid cross", "1 : 2 : 1"],
      [
        "the phenotypes in the F_{2} of a monohybrid cross with complete dominance",
        "3 : 1",
      ],
      ["the phenotypes in a monohybrid test cross of a heterozygote", "1 : 1"],
      ["the phenotypes in the F_{2} of a dihybrid cross", "9 : 3 : 3 : 1"],
    ],
  }).slice(0, 3),
  ...fromTable({
    prefix: "bot-respiration",
    topic: "Respiration in plants",
    stem: (process) => `${process} takes place in the`,
    rows: [
      ["Glycolysis", "cytoplasm"],
      ["The Krebs cycle", "mitochondrial matrix"],
      ["Oxidative phosphorylation", "inner mitochondrial membrane"],
      ["The Calvin cycle", "chloroplast stroma"],
    ],
  }),
]

// ---------------------------------------------------------------------------
// Zoology
// ---------------------------------------------------------------------------

const zoologyAuthored = [
  authored(
    "Excretory products and their elimination",
    "The structural and functional unit of the human kidney is the",
    ["neuron", "nephron", "alveolus", "villus"],
    "B"
  ),
  authored(
    "Body fluids and circulation",
    "Which blood components play the main role in blood clotting?",
    ["Platelets", "Erythrocytes", "Neutrophils", "Lymphocytes"],
    "A"
  ),
  authored(
    "Chemical coordination and integration",
    "Insulin is secreted by the",
    [
      "alpha cells of the islets of Langerhans",
      "acinar cells of the pancreas",
      "beta cells of the islets of Langerhans",
      "delta cells of the islets of Langerhans",
    ],
    "C"
  ),
  authored(
    "Body fluids and circulation",
    "The natural pacemaker of the human heart is the",
    [
      "atrioventricular node",
      "bundle of His",
      "Purkinje fibres",
      "sinoatrial node",
    ],
    "D"
  ),
  authored(
    "Human reproduction",
    "Ovulation in the human menstrual cycle is triggered by a surge of",
    ["luteinising hormone", "progesterone", "prolactin", "oxytocin"],
    "A"
  ),
  authored(
    "Principles of inheritance and variation",
    "Which of the following is an autosomal recessive disorder?",
    [
      "Haemophilia",
      "Sickle-cell anaemia",
      "Down syndrome",
      "Red–green colour blindness",
    ],
    "B"
  ),
  authored(
    "Locomotion and movement",
    "The sliding filament theory explains the mechanism of",
    [
      "nerve impulse conduction",
      "blood clotting",
      "muscle contraction",
      "bone formation",
    ],
    "C"
  ),
  authored(
    "Digestion and absorption",
    "Bile is produced by the",
    ["gall bladder", "pancreas", "duodenum", "liver"],
    "D"
  ),
  authored(
    "Neural control and coordination",
    "Which part of the human brain is chiefly involved in regulating body temperature?",
    ["Hypothalamus", "Cerebellum", "Medulla oblongata", "Corpus callosum"],
    "A"
  ),
  authored(
    "Human health and disease",
    "Antibodies are produced by",
    ["helper T cells", "plasma cells", "neutrophils", "erythrocytes"],
    "B"
  ),
  authored(
    "Principles of inheritance and variation",
    "The number of chromosomes in a normal human somatic cell is",
    ["23", "44", "46", "48"],
    "C"
  ),
  authored(
    "Human health and disease",
    "Malaria in humans is caused by a protozoan of the genus",
    ["Entamoeba", "Trypanosoma", "Leishmania", "Plasmodium"],
    "D"
  ),
  authored(
    "Neural control and coordination",
    "The structural and functional unit of the nervous system is the",
    ["neuron", "nephron", "sarcomere", "glial cell"],
    "A"
  ),
  authored(
    "Body fluids and circulation",
    "The typical resting blood pressure of a healthy adult (systolic/diastolic) is about",
    ["90/60 mm Hg", "120/80 mm Hg", "140/100 mm Hg", "160/110 mm Hg"],
    "B"
  ),
  authored(
    "Chemical coordination and integration",
    "Which hormone is often called the 'emergency hormone'?",
    ["Thyroxine", "Insulin", "Adrenaline", "Melatonin"],
    "C"
  ),
  authored(
    "Human reproduction",
    "Spermatogenesis takes place in the",
    ["epididymis", "vas deferens", "seminal vesicles", "seminiferous tubules"],
    "D"
  ),
  authored(
    "Breathing and exchange of gases",
    "The volume of air inspired or expired during a normal, quiet breath (tidal volume) in a healthy adult is approximately",
    ["500 mL", "1200 mL", "2500 mL", "4600 mL"],
    "A"
  ),
]

const zoologyGenerated = () => [
  ...fromTable({
    prefix: "zoo-gland",
    topic: "Chemical coordination and integration",
    stem: (gland) => `Which hormone is secreted by the ${gland}?`,
    rows: [
      ["thyroid gland", "Thyroxine"],
      ["pineal gland", "Melatonin"],
      ["parathyroid glands", "Parathyroid hormone"],
      ["adrenal cortex", "Cortisol"],
      ["thymus", "Thymosins"],
    ],
  }),
  ...fromTable({
    prefix: "zoo-pathogen",
    topic: "Human health and disease",
    stem: (disease) => `The causative organism of ${disease} is`,
    rows: [
      ["typhoid", "Salmonella typhi"],
      ["amoebiasis", "Entamoeba histolytica"],
      ["ascariasis", "Ascaris"],
      ["bacterial pneumonia", "Streptococcus pneumoniae"],
      ["the common cold", "Rhinoviruses"],
    ],
  }),
  ...fromTable({
    prefix: "zoo-enzyme",
    topic: "Digestion and absorption",
    stem: (enzyme) => `The digestive enzyme ${enzyme} acts on`,
    rows: [
      ["pepsin", "proteins in the stomach"],
      ["salivary amylase", "starch"],
      ["pancreatic lipase", "fats"],
      ["lactase", "lactose"],
      ["trypsin", "proteins in the small intestine"],
    ],
  }),
  ...fromTable({
    prefix: "zoo-vitamin",
    topic: "Human health and disease",
    stem: (deficiency) => `A deficiency of which vitamin causes ${deficiency}?`,
    rows: [
      ["night blindness", "Vitamin A"],
      ["rickets", "Vitamin D"],
      ["scurvy", "Vitamin C"],
      ["beriberi", "Vitamin B_{1}"],
      ["delayed blood clotting", "Vitamin K"],
    ],
  }),
  ...fromTable({
    prefix: "zoo-phylum",
    topic: "Animal kingdom",
    stem: (animal) => `${animal} belongs to the phylum`,
    rows: [
      ["The earthworm", "Annelida"],
      ["The starfish", "Echinodermata"],
      ["Octopus", "Mollusca"],
      ["Aurelia (jellyfish)", "Cnidaria"],
      ["The cockroach", "Arthropoda"],
    ],
  }),
  ...fromTable({
    prefix: "zoo-physiology",
    topic: "Human physiology",
    stem: (quantity) =>
      `In a healthy adult human, ${quantity} is approximately`,
    rows: [
      ["the normal core body temperature", "37 °C"],
      ["the cardiac output at rest", "5 litres per minute"],
      ["the resting heart rate", "72 beats per minute"],
      ["the pH of arterial blood", "7.4"],
    ],
  }).slice(0, 3),
]

const SUBJECTS = Object.freeze({
  physics: { authored: physicsAuthored, generated: physicsGenerated },
  chemistry: { authored: chemistryAuthored, generated: chemistryGenerated },
  botany: { authored: botanyAuthored, generated: botanyGenerated },
  zoology: { authored: zoologyAuthored, generated: zoologyGenerated },
})

// Returns a deterministic bank. Authored and generated items are interleaved
// so short mocks drawing the first N items still cover several topics.
const buildSampleQuestionBank = () => {
  const bank = {}
  for (const [subject, source] of Object.entries(SUBJECTS)) {
    const authoredItems = source.authored
    const generatedItems = source.generated()
    const merged = []
    const longest = Math.max(authoredItems.length, generatedItems.length)
    for (let index = 0; index < longest; index += 1) {
      if (authoredItems[index]) merged.push(authoredItems[index])
      if (generatedItems[index]) merged.push(generatedItems[index])
    }
    for (const item of merged) {
      if (!KEYS.includes(item.correct) || item.options.length !== 4) {
        throw new Error(`Invalid sample item in ${subject}: ${item.text}`)
      }
      if (new Set(item.options).size !== 4) {
        throw new Error(`Duplicate options in ${subject}: ${item.text}`)
      }
    }
    bank[subject] = merged
  }
  return bank
}

module.exports = { buildSampleQuestionBank }
