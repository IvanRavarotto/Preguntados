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

`modelo.pth` holds only the network's `state_dict`. The network is meaningless without the TF-IDF
vectorizer it was trained with: column *i* of the input must be the same term it was during training.
The training notebook fixed every source of randomness —
`train_test_split(test_size=0.2, random_state=42, stratify=y)`, then
`TfidfVectorizer(max_features=5000, stop_words="english")` fitted on the training part, and
`LabelEncoder` (alphabetical classes) — and the fitted vectorizer was exported separately as
`app/vectorizador.joblib`. That export was written with scikit-learn 1.6.1; re-fitting the same recipe
with 1.9.1 gives an identical vocabulary, identical IDF weights and identical vectors for all 5000
questions.

The previous design used a zero-shot Hugging Face model offline and Gemini (ADR-002) on the request
path to judge authored questions.

## Decision

We will categorize every question with the shipped network, both when the dataset is loaded and when a
question is authored, and serve the game by the network's category.

We will ship the fitted vectorizer as `app/vectorizador.joblib` next to `modelo.pth` and load both at
start-up, refusing to run if the file is not a `TfidfVectorizer` or if its vocabulary size differs
from the weights' input size. The vocabulary has 3360 terms, and the network scores 98.5% on the
held-out split and 99.7% on the whole dataset; a test keeps the held-out accuracy at or above 95%, and
another checks that the class order the API assumes is the training `LabelEncoder`'s.

The shipped file is re-exported with scikit-learn 1.9.1 by `scripts/export_vectorizer.py` (verified
identical to the 1.6.1 export), and `scikit-learn` is pinned to `1.9.x` so the API reads it with the
version that wrote it. We will install the CPU-only `torch` wheel, since the API only runs inference.

We will remove the Gemini integration and the zero-shot tooling.

## Alternatives considered

- **Rebuild the vectorizer at start-up from the CSV.** Deterministic and needs no extra file, and it
  was the first implementation. Rejected because it makes the CSV a hidden input of the model: adding
  or correcting a question would change the split and the vocabulary and silently misalign the
  network.
- **Load the original 1.6.1 export as is.** Gives identical results today, but scikit-learn warns that
  unpickling across versions may break without notice.
- **Serve questions by the dataset's own category column.** Exact, but leaves the network unused for the
  game; the purpose of this change is that the network decides.
- **Keep Gemini for plausibility checks.** Requires a network connection and an API key for a feature
  the new design does not need.

## Consequences

- No external service or secret is needed to categorize questions.
- 15 of the 5000 questions are served under a category different from the dataset's (for example
  "Verdadero o falso: Shakira nació en Colombia." goes to `historia`). The dataset label is kept in
  `Question.category` so these can be listed and corrected.
- The CSV is only seed data for the questions: editing it does not affect classification.
- `modelo.pth` and `vectorizador.joblib` are a pair. Retraining must save both in the same run;
  replacing one alone is caught by the size check only when the vocabulary size changes, and by the
  accuracy test otherwise.
- Upgrading scikit-learn past `1.9.x` requires re-exporting `vectorizador.joblib` with the new version.
