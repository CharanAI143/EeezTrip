import pytest
from backend.app.services.intent_classifier import IntentClassifier
from backend.app.schemas.concierge import IntentType

def test_intent_classifier_weather_intent():
    classifier = IntentClassifier()
    intent, conf = classifier.classify_intent("Will it rain in Goa during my trip?")
    assert intent == IntentType.WEATHER_QUESTION
    assert conf >= 0.90

def test_intent_classifier_packing_intent():
    classifier = IntentClassifier()
    intent, conf = classifier.classify_intent("What should I pack for my journey?")
    assert intent == IntentType.PACKING_ADVICE
    assert conf >= 0.90

def test_intent_classifier_revision_intent():
    classifier = IntentClassifier()
    intent, conf = classifier.classify_intent("Make the itinerary cheaper")
    assert intent == IntentType.REVISION_REQUEST
    assert conf >= 0.90

def test_intent_classifier_place_intent():
    classifier = IntentClassifier()
    intent, conf = classifier.classify_intent("Suggest top seafood restaurants near me")
    assert intent == IntentType.PLACE_RECOMMENDATION
    assert conf >= 0.90
