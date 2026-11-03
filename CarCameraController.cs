using UnityEngine;

public class CarCameraController : MonoBehaviour
{
    [Header("追蹤目標")]
    public Transform target;          // 汽車的 Transform

    [Header("位置偏移與平滑度")]
    public Vector3 offset = new Vector3(0f, 3f, -6f); // 相對汽車的預設位置 (高 3, 後退 6)
    public float followSpeed = 10f;   // 位置跟隨速度 (Damping)
    public float lookSpeed = 10f;     // 旋轉瞄準速度

    [Header("動態 FOV (速度感)")]
    public Camera cam;
    public Rigidbody carRigidbody;    // 汽車的剛體，用來取得時速
    public float minFOV = 60f;
    public float maxFOV = 80f;
    public float maxSpeedForFOV = 50f; // 達到此時速時 FOV 最大

    void FixedUpdate()
    {
        if (target == null) return;

        // 1. 計算目標攝影機應該在的位置 (隨汽車的方向旋轉偏移量)
        Vector3 targetPosition = target.TransformPoint(offset);

        // 2. 使用 Lerp 做出平滑的「延遲跟隨」效果
        transform.position = Vector3.Lerp(transform.position, targetPosition, followSpeed * Time.fixedDeltaTime);

        // 3. 讓攝影機平滑地看向汽車
        Vector3 direction = target.position - transform.position;
        Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
        transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, lookSpeed * Time.fixedDeltaTime);

        // 4. 動態調整 FOV 增加速度感
        if (cam != null && carRigidbody != null)
        {
            float currentSpeed = carRigidbody.linearVelocity.magnitude; // Unity 2026 建議使用 linearVelocity
            float speedRatio = Mathf.Clamp01(currentSpeed / maxSpeedForFOV);
            cam.fieldOfView = Mathf.Lerp(minFOV, maxFOV, speedRatio);
        }
    }
}
