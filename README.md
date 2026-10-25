# n-gram / group 10

### Amharic Predictive Text and Next-Word Suggestion System

An interactive NLP application that accepts an incomplete Amharic sentence, estimates likely next words using an n-gram language model, and lets the user select a suggestion to continue writing.

**[Open the live demo →](https://n-gram-app-g10.vercel.app/)**

## Assignment

**Task #4: Build an Amharic Predictive Text and Next-Word Suggestion System (6%)**

**Objective:** Apply n-gram probabilities to a practical NLP problem that students can interact with and evaluate.

The application implements the assignment workflow:

1. Read the user's incomplete Amharic sentence.
2. Extract the final words as context for the selected n-gram order.
3. Retrieve candidate next words from the trained language model.
4. Estimate each candidate's probability or backoff score.
5. Rank candidates and return the top five available suggestions.
6. Allow the user to select a suggestion and continue composing.

## Example

**Input**

```text
ኢትዮጵያ ውስጥ የቡና
```

**Illustrative next words**

```text
ምርት
ንግድ
አምራችነት
```

These examples come from the assignment prompt. Actual predictions and rankings depend on the trained model, selected order, and scoring method.

## Features

- **Amharic writing:** Compose sentences with live next-word suggestions.
- **Inline preview:** Written text appears in bold; the highest-ranked next word appears in gray.
- **Top five recommendations:** Click a suggestion to append it to the sentence. Each recommendation displays its probability or backoff score.
- **Four n-gram orders:** Switch between unigram, bigram, trigram, and 4-gram using inline buttons.
- **Three scoring methods:** Compare absolute discounting, stupid backoff, and unsmoothed maximum likelihood estimation (MLE).
- **Context display:** See the words used to generate predictions.
- **Keyboard shortcuts:** Accept suggestions and clear the editor without using the mouse.
- **Responsive interface:** Dark styling, yellow accents, and a scrolling editor for longer writing.

## How the Model Works

The application loads a compressed, pretrained model from `src/model/app_model.json.gz`. The interface identifies its training corpus as GPAC. The model contains a vocabulary, unigram probabilities, context counts, discount values, and a backoff weight.

### Context and n-gram order

An n-gram model estimates the next word from the preceding **n − 1 words**.

| Order | Model | Context used |
| --- | --- | --- |
| 1 | Unigram | No preceding words; uses unigram probabilities |
| 2 | Bigram | Final one word |
| 3 | Trigram | Final two words |
| 4 | 4-gram | Final three words |

Input is normalized and tokenized before prediction. Processing includes merging selected Ethiopic letter variants, recognizing abbreviations, and handling numbers, URLs, and email addresses. Special model tokens and placeholders are excluded from recommendations. Sentence-ending punctuation resets the prediction context.

### Scoring methods

| Method | Behavior |
| --- | --- |
| Absolute discounting | Discounts observed counts and combines them with lower-order probabilities. This is the default method. |
| Stupid backoff | Uses observed context counts where available and applies a weight when backing off. Outputs are ranking scores, not normalized probabilities. |
| Unsmoothed MLE | Uses the observed next-word count divided by the selected context's total count. Unseen contexts can produce no suggestions. |

For unsmoothed MLE:

```text
P(next word | context) = count(context, next word) / count(context)
```

Candidates are collected from available context entries and frequent unigrams, scored with the selected method, and sorted in descending order. The application returns up to five candidates with positive scores.

## Using the App

1. Open the [live demo](https://n-gram-app-g10.vercel.app/).
2. Choose an n-gram order and scoring method. The defaults are **trigram** and **absolute discounting**.
3. Type an incomplete Amharic sentence.
4. Review the gray inline preview and the recommendations below the editor.
5. Click a recommendation or use a keyboard shortcut to continue writing.

| Shortcut | Action |
| --- | --- |
| `Tab` | Accept the highest-ranked suggestion |
| `Alt` + `1`–`5` | Select the corresponding recommendation |
| `Escape` | Clear the editor |

Use an Amharic keyboard or input method to enter Amharic text.

## Run Locally

**Requirements:** Node.js 20.9 or later and npm.

From the project directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The trained model must be present at `src/model/app_model.json.gz`. It loads automatically on the server when predictions are first requested; no manual model upload is needed.

### Production build

```bash
npm run build
npm start
```

### Code checks

```bash
npm run lint
npx tsc --noEmit
```

## Technology and Structure

Built with **Next.js App Router, React, TypeScript, and CSS**. Model scoring runs on the server through a prediction API.

```text
src/
├── app/
│   ├── api/predict/route.ts   # Prediction endpoint and model loading
│   ├── globals.css           # Styling and responsive layout
│   ├── layout.tsx            # Root layout and metadata
│   └── page.tsx              # Editor, settings, and recommendations
├── lib/
│   └── model.js              # Normalization, tokenization, and n-gram scoring
└── model/
    └── app_model.json.gz     # Compressed pretrained language model
```

### Prediction API

`POST /api/predict`

```json
{
  "text": "ኢትዮጵያ ውስጥ የቡና",
  "order": 3,
  "method": "absdisc"
}
```

Supported methods are `absdisc`, `backoff`, and `mle`. The response contains `items`, an ordered list of `[word, score]` pairs, and `context`, the context tokens used for prediction. Input is limited to 20,000 characters.

## Limitations and Evaluation

Predictions reflect patterns in the training corpus. They do not guarantee grammatical correctness or factual accuracy. Unknown words and unseen contexts can reduce prediction quality; unsmoothed MLE may return fewer than five suggestions or none.

To explore the model, compare the same sentence across orders and methods, inspect the displayed context and rankings, and try both familiar and unseen phrases. This repository provides the interactive application and pretrained model; it does not include a training pipeline or reported benchmark accuracy.

## Group Members

| Name | Student ID |
| --- | --- |
| Lamesgin Desalegn | UGR/0690/15 |
| Natnael Endale | UGR/5583/15 |
| Ruth Ambaw | UGR/8802/15 |
| Yitbarek Alemu | UGR/7554/15 |
| Yonas Tessema | ATR/0419/15 |
