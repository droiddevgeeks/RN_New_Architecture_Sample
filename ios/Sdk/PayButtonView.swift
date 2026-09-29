import UIKit

/// Plain UIKit view backing the `PayButton` Fabric component.
/// `RCTPayButtonComponentView.mm` owns it and maps Fabric props/commands/events.
@objc(PayButtonView)
public final class PayButtonView: UIView {
  @objc public var onPress: (() -> Void)?

  private let button = UIButton(type: .system)
  private let spinner = UIActivityIndicatorView(style: .medium)
  private var isDisabled = false
  private var isOutline = false
  private var isLoading = false

  public override init(frame: CGRect) {
    super.init(frame: frame)
    button.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    button.layer.cornerRadius = 12
    button.layer.borderWidth = 2
    button.addTarget(self, action: #selector(handleTap), for: .touchUpInside)
    button.translatesAutoresizingMaskIntoConstraints = false
    spinner.hidesWhenStopped = true
    spinner.translatesAutoresizingMaskIntoConstraints = false
    addSubview(button)
    addSubview(spinner)
    NSLayoutConstraint.activate([
      button.leadingAnchor.constraint(equalTo: leadingAnchor),
      button.trailingAnchor.constraint(equalTo: trailingAnchor),
      button.topAnchor.constraint(equalTo: topAnchor),
      button.bottomAnchor.constraint(equalTo: bottomAnchor),
      spinner.centerXAnchor.constraint(equalTo: centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: centerYAnchor),
    ])
    applyStyle()
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  @objc(updateWithLabel:amount:disabled:outline:)
  public func update(label: String, amount: String, disabled: Bool, outline: Bool) {
    let title = amount.isEmpty ? label : "\(label) · \(amount)"
    button.setTitle(title, for: .normal)
    isDisabled = disabled
    isOutline = outline
    applyStyle()
  }

  @objc(setLoading:)
  public func setLoading(_ loading: Bool) {
    isLoading = loading
    if loading {
      spinner.startAnimating()
    } else {
      spinner.stopAnimating()
    }
    applyStyle()
  }

  @objc private func handleTap() {
    guard !isDisabled, !isLoading else { return }
    onPress?()
  }

  private func applyStyle() {
    let brand = UIColor(red: 0.42, green: 0.27, blue: 0.95, alpha: 1)
    button.isEnabled = !isDisabled && !isLoading
    button.alpha = isDisabled ? 0.45 : 1
    button.backgroundColor = isOutline ? .clear : brand
    button.layer.borderColor = brand.cgColor
    let titleColor: UIColor = isOutline ? brand : .white
    button.setTitleColor(isLoading ? .clear : titleColor, for: .normal)
    button.setTitleColor(isLoading ? .clear : titleColor, for: .disabled)
    spinner.color = titleColor
  }
}
