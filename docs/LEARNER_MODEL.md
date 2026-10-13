# StudyVerse — Learner Model (Bayesian Knowledge Tracing)

> **Implementation:** `backend/services/learner_model.py` | **Persistence:** `backend/db.py` (`learner_mastery`, `learner_events` tables)

---

## 1. Overview

StudyVerse uses **Bayesian Knowledge Tracing (BKT)**, a hidden Markov model that treats knowledge of a concept as a binary latent variable. The model maintains a probability estimate $P(L_n)$ — the probability that a student has learned a given topic — updated after each observable performance event (quiz answer, chat evidence).

---

## 2. Model Parameters

| Parameter | Symbol | Default | Per-type Override | Meaning |
|-----------|--------|---------|-------------------|---------|
| Initial knowledge | $P(L_0)$ | 0.25 | — | Prior probability the student already knows the topic |
| Learning / transition | $P(T)$ | 0.15 | 0.12–0.20 | Probability of transitioning from *not knowing* to *knowing* after one opportunity |
| Guess | $P(G)$ | 0.20 | 0.15–0.25 | Probability of a correct answer despite not knowing |
| Slip | $P(S)$ | 0.10 | 0.05–0.15 | Probability of an incorrect answer despite knowing |

### Per Question-Type Parameters

```python
QUESTION_TYPE_PARAMS = {
    "mcq":          {"p_g": 0.25, "p_s": 0.10, "p_t": 0.15},  # random-guess baseline = 0.25
    "short_answer": {"p_g": 0.05, "p_s": 0.15, "p_t": 0.20},  # low guess, high slip
    "numerical":    {"p_g": 0.03, "p_s": 0.08, "p_t": 0.18},  # very low guess
    "true_false":   {"p_g": 0.50, "p_s": 0.10, "p_t": 0.12},  # coin-flip guess
}
```

---

## 3. BKT Posterior Update

Given an observation $o \in \{1=\text{correct},\, 0=\text{incorrect}\}$ and the current mastery estimate $P(L_{n-1})$, the posterior is computed in two steps.

### Step 1 — Evidence Update (Bayes Rule)

$$
P(L_n \mid o=1) = \frac{P(L_{n-1}) \cdot (1 - P(S))}{P(L_{n-1}) \cdot (1 - P(S)) + (1 - P(L_{n-1})) \cdot P(G)}
$$

$$
P(L_n \mid o=0) = \frac{P(L_{n-1}) \cdot P(S)}{P(L_{n-1}) \cdot P(S) + (1 - P(L_{n-1})) \cdot (1 - P(G))}
$$

### Step 2 — Knowledge Transition

After the evidence update, account for the possibility that the student learned from the interaction:

$$
P(L_n) = P(L_n \mid o) + \bigl(1 - P(L_n \mid o)\bigr) \cdot P(T)
$$

### Weighted Update (Chat Evidence)

Chat messages provide weaker evidence than a scored quiz answer. A fractional weight $w$ scales the posterior shift:

$$
P(L_n)_\text{weighted} = P(L_{n-1}) + w \cdot \bigl(P(L_n) - P(L_{n-1})\bigr)
$$

For chat evidence: $w = 0.4$. For quiz answers: $w = 1.0$.

---

## 4. Uncertainty / Confidence

Uncertainty captures how reliable the mastery estimate is. It decreases as evidence accumulates.

### Bernoulli Variance

$$
\sigma^2 = P(L_n) \cdot (1 - P(L_n))
$$

Variance is maximized at $P(L_n) = 0.5$ (maximum uncertainty).

### Evidence Damping

$$
\text{uncertainty}(P(L_n), n) = \sigma^2 \cdot \frac{1}{1 + \log(1 + n)}
$$

where $n$ is the cumulative number of attempts. The $\log$ factor causes uncertainty to decay slowly (not collapse after a few observations).

### Confidence

$$
\text{confidence} = 1 - \text{uncertainty}
$$

Both are bounded to $[0.05, 0.95]$ to prevent extreme certainty in either direction.

---

## 5. Chat Evidence Detection

`update_mastery_from_chat_evidence()` applies a fractional BKT update when a student's message contains evidence phrases:

| Signal | Direction | Example Phrases |
|--------|-----------|----------------|
| Mastery / understanding | Positive ($o=1$, $w=0.4$) | `"i understand"`, `"that makes sense"`, `"got it"`, `"now i see"` |
| Confusion / difficulty | Negative ($o=0$, $w=0.4$) | `"i don't understand"`, `"confused"`, `"don't get it"`, `"lost"` |

If neither signal is present, no update is applied.

---

## 6. Knowledge Transition Equation (Full Form)

Combining both steps into a single closed-form expression for the correct-answer case:

$$
P(L_n) = \left[\frac{P(L_{n-1}) \cdot (1-P(S))}{P(L_{n-1}) \cdot (1-P(S)) + (1-P(L_{n-1})) \cdot P(G)}\right] + \left(1 - \left[\frac{P(L_{n-1}) \cdot (1-P(S))}{P(L_{n-1}) \cdot (1-P(S)) + (1-P(L_{n-1})) \cdot P(G)}\right]\right) \cdot P(T)
$$

---

## 7. Scaffolding Thresholds

The mastery estimate determines the scaffolding level and recommended quiz difficulty delivered to the student:

| Mastery $P(L_n)$ | Scaffolding Level | Recommended Difficulty |
|-------------------|------------------|----------------------|
| $< 0.4$ | Beginner | Easy |
| $0.4 \leq P(L_n) < 0.75$ | Intermediate | Medium |
| $\geq 0.75$ | Advanced | Hard |

The `get_scaffolding_recommendation()` function also returns a free-text guidance message per level and topic.

---

## 8. Cold-Start Baseline

When a student has no prior interactions for a topic, `get_learner_topic_state()` returns:

```python
{
    "p_mastery": P_L0,          # = 0.25 (global default)
    "attempts":  0,
    "correct":   0,
    "confidence": 0.05,         # minimum — high uncertainty
    "uncertainty": 0.95
}
```

---

## 9. Persistence Model

Every mastery update writes two records:

1. **`learner_mastery`** — upsert: latest $P(L_n)$, attempts, correct count, confidence.
2. **`learner_events`** — append-only log: event type (`quiz_answer` or `chat_evidence`), weight, correctness flag, timestamp.

The events log enables future offline re-training or audit of the BKT trajectory.

---

## 10. Integration Points

| Trigger | Function | Weight |
|---------|----------|--------|
| Quiz answer evaluated | `update_mastery_from_quiz(student_id, evaluations, doc_id)` | 1.0 |
| Tutor chat message processed | `update_mastery_from_chat_evidence(student_id, topic, message, doc_id)` | 0.4 |
| Diagnostic intake completed | Same as quiz (calls `evaluate_quiz` → `update_mastery_from_quiz`) | 1.0 |

Both integration points are wrapped in `try/except` in the calling service so a BKT failure never breaks the primary chat or quiz response.
