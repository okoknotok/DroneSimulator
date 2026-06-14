# Product Design Review: Mission Mode

## Product Design Prompt

Evaluate the mission mode as a learning product, not just a 3D demo:

1. Who is the target learner?
2. What is the first 30-second hook?
3. What does the learner do repeatedly?
4. What makes success feel rewarding?
5. What makes failure understandable?
6. What makes the next mission attractive?
7. What is the teacher able to observe?
8. What can students remix or improve?

## Current Strengths

- The mode now has chapters, sub-missions, role dialogue, scoring, and dedicated mission blocks.
- It supports model/texture/audio assets through Firebase Hosting.
- It includes fallback low-poly models so the mode still works without external assets.
- The Blockly workflow remains familiar for students.

## Weaknesses To Keep Improving

- Mission selection still feels like a list, not yet a polished chapter map.
- The simulator feedback could be stronger: clearer route trace, task markers, and mission progress animation.
- Weather and environment effects are present but still need art direction and real textures.
- Students need clearer examples of how to solve each mission without revealing the full answer.

## Design Principles

- Keep the map visible. UI panels should collapse or stay at screen edges.
- Make every mission teach one programming concept.
- Reward optimization, not only completion.
- Make failure actionable: tell the student what condition was missing.
- Let students remix: routes, blocks, mission strategies, and eventually custom missions.

## Suggested Product Loop

1. Watch story briefing.
2. Choose mission.
3. Build Blockly program.
4. Run simulation.
5. See live feedback.
6. Complete or fail with reason.
7. Review score and route.
8. Improve solution.

## High-Impact Next Features

- Route replay with path overlay and command timeline.
- Step-by-step mission tutorial cards inspired by MakeCode.
- Mission remix mode inspired by Scratch starter projects.
- Teacher dashboard showing attempts, common failure reasons, and best scores.
- Shareable mission solution snapshot.
