def test_memory_create_list_search_delete(authenticated_client):
    # Create memory item
    response = authenticated_client.post(
        "/memory",
        json={"content": "I live in Paris.", "memory_type": "profile"},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    memory_id = response.json()["id"]

    # List memory items
    response = authenticated_client.get("/memory")
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert memory_id in ids

    # Search memory items
    response = authenticated_client.get("/memory", params={"q": "Paris"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert memory_id in ids

    # Delete memory item
    response = authenticated_client.delete(
        f"/memory/{memory_id}",
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200

    # Ensure deletion
    response = authenticated_client.get("/memory")
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert memory_id not in ids


def test_memory_auto_ingest_from_user_message(authenticated_client):
    # Create conversation
    response = authenticated_client.post(
        "/conversations",
        json={"title": "Memory Test"},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    conv_id = response.json()["id"]

    # Append user message that matches memory patterns
    response = authenticated_client.post(
        f"/conversations/{conv_id}/messages",
        json={"content": "My name is Alex."},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200

    # Auto-ingested memory should appear when include_auto=true
    response = authenticated_client.get("/memory", params={"include_auto": "true"})
    assert response.status_code == 200
    contents = {item["content"] for item in response.json()}
    assert "My name is Alex." in contents
