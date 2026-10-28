# ADR-004 — The project's own MLP network categorizes questions

- **Status**: Accepted
- **Date**: 2026-10-26
- **Change**: `replace-backend-neural-classifier`
- **Supersedes**: ADR-002

## Context

The project now has its own dataset, `app/trivia_latam_argentina.csv` (5000 Spanish trivia questions,
about 833 per category), and a network trained on it: `MLPClassifier(nn.Module)`, a
`Linear(3360→256) → ReLU → Dropout(0.3) → Linear(256→64) → ReLU → Dropout(0.3) → Linear(64→6)` stack
over TF-IDF vectors of the question text. Its weights are in `app/modelo.pth`.

`modelo.pth` holds only the network's `state_dict`. The TF-IDF vectorizer and the label order it was
trained with are not saved, and the network is meaningless without them: column *i* of the input must
be the same term it was during training. The training notebook fixed every source of randomness —
`train_test_split(test_size=0.2, random_state=42, stratify=y)`, then
`TfidfVectorizer(max_features=5000, stop_words="english")` fitted on the training part, and
`LabelEncoder` (alphabetical classes).

The previous design used a zero-shot Hugging Face model offline and Gemini (ADR-002) on the request
path to judge authored questions.

## Decision

We will categorize every question with the shipped network, both when the dataset is loaded and when a
question is authored, and serve the game by the network's category.

We will rebuild the vectorizer at start-up by repeating the training-time split and fit, and refuse to
run if its vocabulary size differs from the weights' input size. Rebuilt this way the vocabulary has
3360 terms, and the network scores 98.5% on the held-out split and 99.7% on the whole dataset; a test
keeps the held-out accuracy at or above 95%.

We will pin `scikit-learn` to `1.9.x`, the version the weights were trained with, and install the
CPU-only `torch` wheel, since the API only runs inference.

We will remove the Gemini integration and the zero-shot tooling.

## Alternatives considered

- **Persist the fitted vectorizer (pickle/joblib) next to the weights.** Removes the dependency on the
  CSV and on the split being reproducible, but `modelo.pth` was handed over without it, and a pickled
  scikit-learn object is tied to the version that wrote it just as tightly. Rebuilding is deterministic
  and is guarded by the size check and the accuracy test. Worth revisiting if the network is retrained.
- **Serve questions by the dataset's own category column.** Exact, but leaves the network unused for the
  game; the purpose of this change is that the network decides.
- **Keep Gemini for plausibility checks.** Requires a network connection and an API key for a feature
  the new design does not need.

## Consequences

- No external service or secret is needed to categorize questions.
- 15 of the 5000 questions are served under a category different from the dataset's (for example
  "Verdadero o falso: Shakira nació en Colombia." goes to `historia`). The dataset label is kept in
  `Question.category` so these can be listed and corrected.
- The CSV is now a runtime input of the classifier, not just seed data: editing it changes the rebuilt
  vocabulary, which the size check will usually catch and the accuracy test will catch otherwise. Any
  change to the dataset requires retraining and replacing `modelo.pth`.
- Start-up spends about a second fitting the vectorizer.
