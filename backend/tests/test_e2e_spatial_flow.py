import requests
import json

def test_full_spatial_pipeline():
    base_url = "http://localhost:8000/api/v1"

    # 1. Create Analysis
    res = requests.post(f"{base_url}/analyses/", json={
        "title": "Anantapur Check Dam Spatial Validation",
        "description": "Cross-modal spatial verification of field masonry check dam."
    })
    assert res.status_code == 200
    analysis = res.json()
    analysis_id = analysis["id"]
    print(f"Created Analysis #{analysis_id}")

    # 2. Upload Field Image with GPS
    with open("demo_data/sample_images/demo_check_dam.jpg", "rb") as f:
        upload_res = requests.post(
            f"{base_url}/analyses/{analysis_id}/upload-image",
            files={"file": ("demo_check_dam.jpg", f, "image/jpeg")},
            data={"latitude": 14.6812, "longitude": 77.6015}
        )
    assert upload_res.status_code == 200
    print("Uploaded image and executed AI model inference")

    # 3. Fetch Spatial Evidence for 25m, 50m, 100m
    for radius in [25, 50, 100]:
        ev_res = requests.get(f"{base_url}/analyses/{analysis_id}/spatial-evidence?radius={radius}")
        assert ev_res.status_code == 200
        ev = ev_res.json()
        print(f"Radius {radius}m -> NDVI: {ev['buffer_evidence']['ndvi']['mean']}, NDWI: {ev['buffer_evidence']['ndwi']['mean']}, Status: {ev['evidence_fusion']['status']}")
        assert "analysis_id" in ev
        assert "spatial_registration" in ev
        assert "satellite_provenance" in ev
        assert "evidence_fusion" in ev
        assert "temporal_change" in ev
        assert "watershed_context" in ev

    # 4. Check Watersheds & System Status
    ws_res = requests.get(f"{base_url}/watersheds")
    assert ws_res.status_code == 200
    assert len(ws_res.json()) >= 3

    sys_res = requests.get(f"{base_url}/system/status")
    assert sys_res.status_code == 200
    assert sys_res.json()["overall_status"] == "Healthy"

    print("\nALL GEOSPATIAL PIPELINE CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_spatial_pipeline()
